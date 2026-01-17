"use client"

import { Cloud, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    clearExternalStorageConfig,
    type ExternalStorageConfig,
    getDefaultExternalStorageConfig,
    getExternalStorageConfig,
    saveExternalStorageConfig,
} from "@/lib/external-storage"

interface ExternalStorageModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ExternalStorageModal({
    open,
    onOpenChange,
}: ExternalStorageModalProps) {
    const [config, setConfig] = useState<ExternalStorageConfig>(
        getDefaultExternalStorageConfig(),
    )
    const [headersJson, setHeadersJson] = useState("{}")
    const [mappingJson, setMappingJson] = useState(
        JSON.stringify(
            getDefaultExternalStorageConfig().mappingSchema,
            null,
            2,
        ),
    )
    const [headersError, setHeadersError] = useState("")
    const [mappingError, setMappingError] = useState("")

    // Load stored config on mount
    useEffect(() => {
        if (open) {
            const storedConfig = getExternalStorageConfig()
            if (storedConfig) {
                setConfig(storedConfig)
                setHeadersJson(JSON.stringify(storedConfig.headers, null, 2))
                setMappingJson(
                    JSON.stringify(storedConfig.mappingSchema, null, 2),
                )
            } else {
                const defaultConfig = getDefaultExternalStorageConfig()
                setConfig(defaultConfig)
                setHeadersJson(JSON.stringify(defaultConfig.headers, null, 2))
                setMappingJson(
                    JSON.stringify(defaultConfig.mappingSchema, null, 2),
                )
            }
        }
    }, [open])

    // Handle headers JSON change
    const handleHeadersChange = (value: string) => {
        setHeadersJson(value)
        try {
            const parsed = JSON.parse(value)
            if (typeof parsed !== "object" || Array.isArray(parsed)) {
                setHeadersError("Headers must be a JSON object")
            } else {
                setHeadersError("")
                setConfig((prev) => ({ ...prev, headers: parsed }))
            }
        } catch {
            setHeadersError("Invalid JSON")
        }
    }

    // Handle mapping schema JSON change
    const handleMappingChange = (value: string) => {
        setMappingJson(value)
        try {
            const parsed = JSON.parse(value)
            if (typeof parsed !== "object" || Array.isArray(parsed)) {
                setMappingError("Mapping schema must be a JSON object")
            } else {
                setMappingError("")
                setConfig((prev) => ({ ...prev, mappingSchema: parsed }))
            }
        } catch {
            setMappingError("Invalid JSON")
        }
    }

    // Save configuration
    const handleSave = () => {
        if (headersError || mappingError) {
            toast.error("Please fix JSON errors before saving")
            return
        }
        saveExternalStorageConfig(config)
        toast.success("External storage configuration saved")
        onOpenChange(false)
    }

    // Clear configuration
    const handleClear = () => {
        clearExternalStorageConfig()
        const defaultConfig = getDefaultExternalStorageConfig()
        setConfig(defaultConfig)
        setHeadersJson(JSON.stringify(defaultConfig.headers, null, 2))
        setMappingJson(JSON.stringify(defaultConfig.mappingSchema, null, 2))
        toast.success("External storage configuration cleared")
    }

    // Test the connection
    // Test connection by sending a HEAD request to verify endpoint accessibility
    // Note: This only verifies the endpoint is reachable, not that it accepts the payload format
    const handleTest = async () => {
        if (!config.endpointUrl) {
            toast.error("Please enter an endpoint URL")
            return
        }

        toast.info("Testing connection...")

        try {
            // Use HEAD request if supported, fallback to OPTIONS for CORS preflight check
            // This tests endpoint reachability without sending actual data
            const response = await fetch(config.endpointUrl, {
                method: "HEAD",
                headers: config.headers,
            }).catch(() =>
                // If HEAD fails (405), try OPTIONS for CORS preflight
                fetch(config.endpointUrl, {
                    method: "OPTIONS",
                    headers: config.headers,
                }),
            )

            if (
                response.ok ||
                response.status === 204 ||
                response.status === 405
            ) {
                toast.success(
                    "Connection test successful - endpoint is reachable",
                )
            } else {
                toast.error(`Connection test failed: HTTP ${response.status}`)
            }
        } catch (error) {
            toast.error(
                `Connection test failed: ${error instanceof Error ? error.message : "Network error"}`,
            )
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Cloud className="h-5 w-5" />
                        External Storage
                    </DialogTitle>
                    <DialogDescription>
                        Save diagrams directly to your external API
                        (ERP/CRM/CMS)
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between py-3 border-b">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-medium">
                                Enable External Storage
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Send diagram data to external API on save
                            </p>
                        </div>
                        <Switch
                            checked={config.enabled}
                            onCheckedChange={(enabled) =>
                                setConfig((prev) => ({ ...prev, enabled }))
                            }
                        />
                    </div>

                    {/* Endpoint URL */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Endpoint URL
                        </Label>
                        <Input
                            value={config.endpointUrl}
                            onChange={(e) =>
                                setConfig((prev) => ({
                                    ...prev,
                                    endpointUrl: e.target.value,
                                }))
                            }
                            placeholder="https://your-api.com/diagrams/save"
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Method */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            HTTP Method
                        </Label>
                        <Select
                            value={config.method}
                            onValueChange={(method: "POST" | "PUT") =>
                                setConfig((prev) => ({ ...prev, method }))
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="POST">POST</SelectItem>
                                <SelectItem value="PUT">PUT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Headers */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Headers (JSON)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Authentication and custom headers
                        </p>
                        <textarea
                            value={headersJson}
                            onChange={(e) =>
                                handleHeadersChange(e.target.value)
                            }
                            placeholder='{"Authorization": "Bearer your-token"}'
                            className="w-full h-24 p-3 font-mono text-sm border rounded-lg bg-background resize-none"
                        />
                        {headersError && (
                            <p className="text-xs text-destructive">
                                {headersError}
                            </p>
                        )}
                    </div>

                    {/* Mapping Schema */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Mapping Schema (JSON)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Map fields to your API. Variables: $xml, $filename,
                            $timestamp, $date
                        </p>
                        <textarea
                            value={mappingJson}
                            onChange={(e) =>
                                handleMappingChange(e.target.value)
                            }
                            placeholder='{"content": "$xml", "name": "$filename"}'
                            className="w-full h-32 p-3 font-mono text-sm border rounded-lg bg-background resize-none"
                        />
                        {mappingError && (
                            <p className="text-xs text-destructive">
                                {mappingError}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-muted/30 flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleTest}
                        disabled={!config.endpointUrl}
                    >
                        Test Connection
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleClear}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear
                    </Button>
                    <div className="flex-1" />
                    <Button onClick={handleSave}>Save Configuration</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
