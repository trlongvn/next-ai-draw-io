import { NextResponse } from "next/server"
import { z } from "zod"
import { saveToExternal } from "@/lib/external-storage"

// Request body schema
const SaveRequestSchema = z.object({
    xml: z.string().min(1, "XML content is required"),
    filename: z.string().min(1, "Filename is required"),
})

export async function POST(req: Request): Promise<Response> {
    // Check for access code if configured
    const accessCodes =
        process.env.ACCESS_CODE_LIST?.split(",")
            .map((code) => code.trim())
            .filter(Boolean) || []

    if (accessCodes.length > 0) {
        const accessCodeHeader = req.headers.get("x-access-code")
        if (!accessCodeHeader || !accessCodes.includes(accessCodeHeader)) {
            return NextResponse.json(
                {
                    status: "error",
                    error: "Invalid or missing access code",
                },
                { status: 401 },
            )
        }
    }

    try {
        const body = await req.json()
        const parsed = SaveRequestSchema.parse(body)

        const result = await saveToExternal(parsed.xml, parsed.filename)

        if (result.success) {
            return NextResponse.json({
                status: "success",
                data: result.response,
            })
        }

        return NextResponse.json(
            {
                status: "error",
                error: result.error,
            },
            { status: 400 },
        )
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
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
        return NextResponse.json(
            {
                status: "error",
                error: message,
            },
            { status: 500 },
        )
    }
}
