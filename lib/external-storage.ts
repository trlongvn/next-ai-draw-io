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

    for (const [key, template] of Object.entries(mappingSchema)) {
        let value = template

        // Replace variables
        value = value.replace(/\$xml/g, data.xml)
        value = value.replace(/\$filename/g, data.filename)
        value = value.replace(/\$timestamp/g, now.toISOString())
        value = value.replace(/\$date/g, now.toISOString().split("T")[0])

        // Try to parse as JSON if it looks like JSON
        if (value.startsWith("{") || value.startsWith("[")) {
            try {
                result[key] = JSON.parse(value)
            } catch {
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
