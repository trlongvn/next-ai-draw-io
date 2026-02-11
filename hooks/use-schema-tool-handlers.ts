import { useCallback, useRef } from "react"
import type { DrawDBSchema } from "@/lib/drawdb-utils"
import { validateDrawDBSchema } from "@/lib/drawdb-utils"

const DEBUG = process.env.NODE_ENV === "development"

interface ToolCall {
    toolCallId: string
    toolName: string
    input: unknown
}

interface AddToolOutputSuccess {
    tool: string
    toolCallId: string
    state?: "output-available"
    output: string
    errorText?: undefined
}

interface AddToolOutputError {
    tool: string
    toolCallId: string
    state: "output-error"
    output?: undefined
    errorText: string
}

type AddToolOutputParams = AddToolOutputSuccess | AddToolOutputError
type AddToolOutputFn = (params: AddToolOutputParams) => void

interface UseSchemaToolHandlersParams {
    onDisplaySchema: (schema: DrawDBSchema) => string | null
}

/**
 * Hook that creates the onToolCall handler for schema-related tools.
 * Handles the display_schema tool - parallel to useDiagramToolHandlers for Draw.io.
 */
export function useSchemaToolHandlers({
    onDisplaySchema,
}: UseSchemaToolHandlersParams) {
    const handleToolCall = useCallback(
        async (
            { toolCall }: { toolCall: ToolCall },
            addToolOutput: AddToolOutputFn,
        ) => {
            if (DEBUG) {
                console.log(
                    `[Schema onToolCall] Tool: ${toolCall.toolName}, CallId: ${toolCall.toolCallId}`,
                )
            }

            if (toolCall.toolName === "display_schema") {
                handleDisplaySchema(toolCall, addToolOutput)
            }
        },
        [onDisplaySchema],
    )

    const handleDisplaySchema = useCallback(
        (toolCall: ToolCall, addToolOutput: AddToolOutputFn) => {
            const { schema: schemaStr } = toolCall.input as { schema: string }

            if (DEBUG) {
                console.log(
                    "[display_schema] Raw input length:",
                    schemaStr?.length,
                )
            }

            // Parse JSON
            let schema: DrawDBSchema
            try {
                schema =
                    typeof schemaStr === "string"
                        ? JSON.parse(schemaStr)
                        : schemaStr
            } catch (e) {
                console.warn("[display_schema] JSON parse error:", e)
                addToolOutput({
                    tool: "display_schema",
                    toolCallId: toolCall.toolCallId,
                    state: "output-error",
                    errorText: `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}. Please fix the JSON and call display_schema again.`,
                })
                return
            }

            // Validate schema
            if (!validateDrawDBSchema(schema)) {
                console.warn("[display_schema] Schema validation failed")
                addToolOutput({
                    tool: "display_schema",
                    toolCallId: toolCall.toolCallId,
                    state: "output-error",
                    errorText: `Invalid schema structure. Schema must have a "tables" array where each table has "id", "name", and "fields" array. Each field must have "id", "name", and "type". Please fix and try again.`,
                })
                return
            }

            // Load schema into ER diagram
            const error = onDisplaySchema(schema)

            if (error) {
                console.warn("[display_schema] Load error:", error)
                addToolOutput({
                    tool: "display_schema",
                    toolCallId: toolCall.toolCallId,
                    state: "output-error",
                    errorText: `${error}\n\nPlease fix the schema and call display_schema again.`,
                })
            } else {
                if (DEBUG) {
                    console.log(
                        "[display_schema] Success! Schema loaded with",
                        schema.tables.length,
                        "tables",
                    )
                }
                addToolOutput({
                    tool: "display_schema",
                    toolCallId: toolCall.toolCallId,
                    output: `Successfully displayed the database schema with ${schema.tables.length} table(s) and ${schema.relationships?.length || 0} relationship(s).`,
                })
            }
        },
        [onDisplaySchema],
    )

    return { handleToolCall }
}
