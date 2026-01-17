import { generateText } from "ai"
import { z } from "zod"
import { getAIModel } from "@/lib/ai-providers"
import { getSystemPrompt } from "@/lib/system-prompts"

export const maxDuration = 120

// Request body schema for JSON requests
const GenerateRequestSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    context_xml: z.string().optional(),
    model_config: z
        .object({
            provider: z.string().optional(),
            model: z.string().optional(),
            api_key: z.string().optional(),
            base_url: z.string().optional(),
        })
        .optional(),
    minimal_style: z.boolean().optional().default(false),
})

// Extract clean XML from LLM response
function extractXmlFromResponse(text: string): string | null {
    // Try to find XML in various formats
    // 1. Look for mxGraphModel wrapper
    const mxGraphMatch = text.match(
        /<mxGraphModel[^>]*>[\s\S]*<\/mxGraphModel>/i,
    )
    if (mxGraphMatch) {
        return mxGraphMatch[0]
    }

    // 2. Look for mxCell elements (most common in our tool calls)
    const mxCellMatch = text.match(/<mxCell[\s\S]*<\/mxCell>/i)
    if (mxCellMatch) {
        // Wrap in standard structure if just mxCell elements
        return wrapMxCells(mxCellMatch[0])
    }

    // 3. Look for XML code blocks
    const codeBlockMatch = text.match(/```(?:xml)?\s*([\s\S]*?)```/i)
    if (codeBlockMatch) {
        const content = codeBlockMatch[1].trim()
        if (content.includes("<mxCell")) {
            return wrapMxCells(content)
        }
        if (content.includes("<mxGraphModel")) {
            return content
        }
    }

    return null
}

// Wrap mxCell elements in standard mxGraphModel structure
function wrapMxCells(mxCellContent: string): string {
    return `<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    ${mxCellContent}
  </root>
</mxGraphModel>`
}

// Extract explanation from LLM response
function extractExplanation(text: string): string {
    // Remove XML and code blocks
    const explanation = text
        .replace(/<mxGraphModel[\s\S]*<\/mxGraphModel>/gi, "")
        .replace(/<mxCell[\s\S]*<\/mxCell>/gi, "")
        .replace(/```[\s\S]*?```/g, "")
        .trim()

    // If empty, return a default message
    if (!explanation) {
        return "Diagram generated successfully."
    }

    return explanation
}

export async function POST(req: Request): Promise<Response> {
    // Check for API key authentication
    const apiKey = req.headers.get("x-api-key")
    const expectedApiKey = process.env.HEADLESS_API_KEY

    if (expectedApiKey && apiKey !== expectedApiKey) {
        return Response.json(
            {
                status: "error",
                error: "Invalid or missing API key",
            },
            { status: 401 },
        )
    }

    // Check for access code if configured
    const accessCodes =
        process.env.ACCESS_CODE_LIST?.split(",")
            .map((code) => code.trim())
            .filter(Boolean) || []
    if (accessCodes.length > 0 && !apiKey) {
        const accessCodeHeader = req.headers.get("x-access-code")
        if (!accessCodeHeader || !accessCodes.includes(accessCodeHeader)) {
            return Response.json(
                {
                    status: "error",
                    error: "Invalid or missing access code",
                },
                { status: 401 },
            )
        }
    }

    try {
        let body: z.infer<typeof GenerateRequestSchema>

        // Parse request body based on content type
        const contentType = req.headers.get("content-type") || ""

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData()
            const prompt = formData.get("prompt") as string | null
            const contextXml = formData.get("context_xml") as string | null
            const modelConfigStr = formData.get("model_config") as string | null
            const minimalStyleStr = formData.get("minimal_style") as
                | string
                | null

            let modelConfig
            if (modelConfigStr) {
                try {
                    modelConfig = JSON.parse(modelConfigStr)
                } catch {
                    return Response.json(
                        {
                            status: "error",
                            error: "Invalid model_config JSON",
                        },
                        { status: 400 },
                    )
                }
            }

            body = GenerateRequestSchema.parse({
                prompt,
                context_xml: contextXml || undefined,
                model_config: modelConfig,
                minimal_style: minimalStyleStr === "true",
            })

            // Handle file upload (optional)
            const file = formData.get("file") as File | null
            if (file) {
                // For now, we log that a file was uploaded
                // Full image processing would require additional implementation
                console.log(
                    `[Headless API] File uploaded: ${file.name}, type: ${file.type}`,
                )
            }
        } else {
            // JSON body
            const json = await req.json()
            body = GenerateRequestSchema.parse(json)
        }

        // Get AI model configuration
        const clientOverrides = body.model_config
            ? {
                  provider: body.model_config.provider || null,
                  modelId: body.model_config.model || null,
                  apiKey: body.model_config.api_key || null,
                  baseUrl: body.model_config.base_url || null,
              }
            : undefined

        const { model, providerOptions, headers, modelId } =
            getAIModel(clientOverrides)

        // Get system prompt
        const systemMessage = getSystemPrompt(modelId, body.minimal_style)

        // Build context message
        const contextMessage = body.context_xml
            ? `Current diagram XML:\n"""xml\n${body.context_xml}\n"""\n\n`
            : ""

        // Build user message
        const userMessage = `${contextMessage}User request: ${body.prompt}`

        // Generate response (non-streaming)
        const result = await generateText({
            model,
            ...(providerOptions && { providerOptions }),
            ...(headers && { headers }),
            system: systemMessage,
            messages: [
                {
                    role: "user",
                    content: userMessage,
                },
            ],
            tools: {
                display_diagram: {
                    description: "Display a diagram on draw.io",
                    parameters: z.object({
                        xml: z.string().describe("XML string for the diagram"),
                    }),
                },
            },
            maxSteps: 3,
            ...(process.env.TEMPERATURE !== undefined && {
                temperature: parseFloat(process.env.TEMPERATURE),
            }),
        })

        // Extract XML from tool calls or text response
        let xmlResult: string | null = null
        let explanation = ""

        // Check tool calls first
        for (const step of result.steps) {
            for (const toolCall of step.toolCalls) {
                if (toolCall.toolName === "display_diagram") {
                    const input =
                        (toolCall as any).args ?? (toolCall as any).input
                    if (input?.xml) {
                        xmlResult = wrapMxCells(input.xml)
                        break
                    }
                }
            }
            if (xmlResult) break
        }

        // If no tool call, try to extract from text
        if (!xmlResult && result.text) {
            xmlResult = extractXmlFromResponse(result.text)
        }

        // Extract explanation
        explanation = extractExplanation(result.text)

        if (!xmlResult) {
            return Response.json(
                {
                    status: "error",
                    error: "Failed to generate diagram XML",
                    explanation: result.text,
                },
                { status: 422 },
            )
        }

        return Response.json({
            status: "success",
            data: {
                xml: xmlResult,
                explanation,
            },
        })
    } catch (error) {
        console.error("Error in headless generate:", error)

        if (error instanceof z.ZodError) {
            return Response.json(
                {
                    status: "error",
                    error: "Validation failed",
                    details: error.issues,
                },
                { status: 400 },
            )
        }

        const message =
            error instanceof Error
                ? error.message
                : "An unexpected error occurred"
        return Response.json(
            {
                status: "error",
                error: message,
            },
            { status: 500 },
        )
    }
}
