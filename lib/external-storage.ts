/**
 * External Storage Utility
 *
 * Provides functionality to save diagram data to external APIs (webhooks/callbacks).
 * Allows integration with ERP/CRM/CMS systems.
 *
 * Configuration is read from environment variables:
 * - EXTERNAL_STORAGE_ENABLED: "true" to enable
 * - EXTERNAL_STORAGE_ENDPOINT_URL: The webhook/API endpoint URL
 * - EXTERNAL_STORAGE_METHOD: "POST" or "PUT" (default: POST)
 * - EXTERNAL_STORAGE_HEADERS: JSON string of custom headers (e.g., '{"Authorization": "Bearer token"}')
 * - EXTERNAL_STORAGE_MAPPING: JSON string of field mapping (e.g., '{"content": "$xml", "title": "$filename"}')
 */

export interface ExternalStorageConfig {
    endpointUrl: string
    method: "POST" | "PUT"
    headers: Record<string, string>
    mappingSchema: Record<string, string>
    enabled: boolean
}

export interface SaveToExternalResult {
    success: boolean
    error?: string
    response?: unknown
}

/**
 * Get external storage configuration from environment variables (server-side)
 */
export function getExternalStorageConfigFromEnv(): ExternalStorageConfig {
    const enabled = process.env.EXTERNAL_STORAGE_ENABLED === "true"
    const endpointUrl = process.env.EXTERNAL_STORAGE_ENDPOINT_URL || ""
    const method = (process.env.EXTERNAL_STORAGE_METHOD || "POST") as
        | "POST"
        | "PUT"

    let headers: Record<string, string> = {}
    if (process.env.EXTERNAL_STORAGE_HEADERS) {
        try {
            headers = JSON.parse(process.env.EXTERNAL_STORAGE_HEADERS)
        } catch {
            console.error("Failed to parse EXTERNAL_STORAGE_HEADERS")
        }
    }

    let mappingSchema: Record<string, string> = {
        content: "$xml",
        title: "$filename",
        created_at: "$timestamp",
    }
    if (process.env.EXTERNAL_STORAGE_MAPPING) {
        try {
            mappingSchema = JSON.parse(process.env.EXTERNAL_STORAGE_MAPPING)
        } catch {
            console.error("Failed to parse EXTERNAL_STORAGE_MAPPING")
        }
    }

    return {
        enabled,
        endpointUrl,
        method,
        headers,
        mappingSchema,
    }
}

/**
 * Check if external storage is enabled (can be called client-side via API)
 */
export function isExternalStorageEnabled(): boolean {
    return process.env.EXTERNAL_STORAGE_ENABLED === "true"
}

/**
 * Apply mapping schema to replace variables with actual values
 *
 * Supported variables:
 * - $xml: The diagram XML content
 * - $filename: The filename
 * - $timestamp: Current ISO timestamp
 * - $date: Current date (YYYY-MM-DD)
 */
function applyMappingSchema(
    mappingSchema: Record<string, string>,
    data: {
        xml: string
        filename: string
    },
): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const now = new Date()

    // Create a map of variable replacements
    // Each variable is matched exactly to prevent partial matches
    const variables: Record<string, string> = {
        $xml: data.xml,
        $filename: data.filename,
        $timestamp: now.toISOString(),
        $date: now.toISOString().split("T")[0],
    }

    for (const [key, template] of Object.entries(mappingSchema)) {
        let value = template

        // Replace variables using exact matching with word boundaries
        for (const [variable, replacement] of Object.entries(variables)) {
            // Escape special regex characters in variable name
            const escapedVar = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            // Match the variable followed by non-alphanumeric or end of string
            const regex = new RegExp(`${escapedVar}(?![a-zA-Z0-9_])`, "g")
            value = value.replace(regex, replacement)
        }

        // Only try to parse as JSON if the value exactly matches after replacement
        // AND it starts and ends with proper JSON delimiters
        const trimmedValue = value.trim()
        const looksLikeJsonObject =
            trimmedValue.startsWith("{") && trimmedValue.endsWith("}")
        const looksLikeJsonArray =
            trimmedValue.startsWith("[") && trimmedValue.endsWith("]")

        if (looksLikeJsonObject || looksLikeJsonArray) {
            try {
                result[key] = JSON.parse(trimmedValue)
            } catch {
                // Not valid JSON, use as string
                result[key] = value
            }
        } else {
            result[key] = value
        }
    }

    return result
}

/**
 * Save diagram to external API (server-side only)
 * Reads configuration from environment variables
 */
export async function saveToExternal(
    xmlContent: string,
    fileName: string,
): Promise<SaveToExternalResult> {
    // Get config from environment variables
    const storageConfig = getExternalStorageConfigFromEnv()

    if (!storageConfig.enabled) {
        return {
            success: false,
            error: "External storage is not enabled. Set EXTERNAL_STORAGE_ENABLED=true in environment.",
        }
    }

    if (!storageConfig.endpointUrl) {
        return {
            success: false,
            error: "Endpoint URL is required. Set EXTERNAL_STORAGE_ENDPOINT_URL in environment.",
        }
    }

    try {
        // Build request payload using mapping schema
        const payload = applyMappingSchema(storageConfig.mappingSchema, {
            xml: xmlContent,
            filename: fileName,
        })

        // Make the request
        const response = await fetch(storageConfig.endpointUrl, {
            method: storageConfig.method,
            headers: {
                "Content-Type": "application/json",
                ...storageConfig.headers,
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error")
            return {
                success: false,
                error: `HTTP ${response.status}: ${errorText}`,
            }
        }

        // Try to parse response as JSON
        let responseData: unknown
        try {
            responseData = await response.json()
        } catch {
            responseData = await response.text()
        }

        return {
            success: true,
            response: responseData,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Network error"
        return {
            success: false,
            error: message,
        }
    }
}

/**
 * Get default external storage configuration
 */
export function getDefaultExternalStorageConfig(): ExternalStorageConfig {
    return {
        endpointUrl: "",
        method: "POST",
        headers: {},
        mappingSchema: {
            content: "$xml",
            title: "$filename",
            created_at: "$timestamp",
        },
        enabled: false,
    }
}
