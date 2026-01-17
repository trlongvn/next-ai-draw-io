/**
 * External Storage Utility
 *
 * Provides functionality to save diagram data to external APIs (webhooks/callbacks).
 * Allows integration with ERP/CRM/CMS systems.
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

// LocalStorage key for external storage configuration
export const EXTERNAL_STORAGE_KEY = "next-ai-draw-io-external-storage"

/**
 * Get external storage configuration from localStorage
 */
export function getExternalStorageConfig(): ExternalStorageConfig | null {
    if (typeof window === "undefined") return null

    try {
        const stored = localStorage.getItem(EXTERNAL_STORAGE_KEY)
        if (!stored) return null

        const config = JSON.parse(stored)
        return config as ExternalStorageConfig
    } catch (error) {
        console.error("Failed to parse external storage config:", error)
        return null
    }
}

/**
 * Save external storage configuration to localStorage
 */
export function saveExternalStorageConfig(config: ExternalStorageConfig): void {
    if (typeof window === "undefined") return

    localStorage.setItem(EXTERNAL_STORAGE_KEY, JSON.stringify(config))
}

/**
 * Clear external storage configuration
 */
export function clearExternalStorageConfig(): void {
    if (typeof window === "undefined") return

    localStorage.removeItem(EXTERNAL_STORAGE_KEY)
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
 * Save diagram to external API
 */
export async function saveToExternal(
    xmlContent: string,
    fileName: string,
    config?: ExternalStorageConfig,
): Promise<SaveToExternalResult> {
    // Get config from parameter or localStorage
    const storageConfig = config || getExternalStorageConfig()

    if (!storageConfig) {
        return {
            success: false,
            error: "External storage not configured",
        }
    }

    if (!storageConfig.enabled) {
        return {
            success: false,
            error: "External storage is disabled",
        }
    }

    if (!storageConfig.endpointUrl) {
        return {
            success: false,
            error: "Endpoint URL is required",
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
