"use client"

import { CheckCircle, Copy, ExternalLink, Key, XCircle } from "lucide-react"
import dynamic from "next/dynamic"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getBasePath } from "@/lib/base-path"

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(
    () => import("swagger-ui-react").then((mod) => mod.default || mod),
    {
        ssr: false,
        loading: () => (
            <div className="h-96 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        ),
    },
)

interface ApiDeveloperModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    headlessApiEnabled?: boolean
    externalStorageEnabled?: boolean
}

// Tab type
type TabType = "configuration" | "documentation"

export function ApiDeveloperModal({
    open,
    onOpenChange,
    headlessApiEnabled = false,
    externalStorageEnabled = false,
}: ApiDeveloperModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("configuration")

    // Copy example to clipboard
    const copyExample = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toast.success("Copied to clipboard")
        } catch {
            toast.error("Failed to copy")
        }
    }

    // Get the current origin for the API endpoint
    const getFullApiEndpoint = () => {
        const basePath = getBasePath()
        if (typeof window === "undefined") return `${basePath}/api/v1/generate`
        return `${window.location.origin}${basePath}/api/v1/generate`
    }

    const getExternalSaveEndpoint = () => {
        const basePath = getBasePath()
        if (typeof window === "undefined")
            return `${basePath}/api/v1/external-save`
        return `${window.location.origin}${basePath}/api/v1/external-save`
    }

    const exampleCurl = `curl -X POST ${getFullApiEndpoint()} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: \${HEADLESS_API_KEY}" \\
  -d '{
    "prompt": "Create a simple flowchart"
  }'`

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Developer Tools
                    </DialogTitle>
                    <DialogDescription>
                        Headless API for diagram generation. Configuration is
                        managed via environment variables.
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="border-b px-6">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab("configuration")}
                            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                                activeTab === "configuration"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Configuration
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("documentation")}
                            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                                activeTab === "documentation"
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Documentation
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-auto px-6 py-4">
                    {activeTab === "configuration" && (
                        <div className="space-y-6">
                            {/* Status Section */}
                            <div className="space-y-4">
                                <Label className="text-sm font-medium">
                                    API Status
                                </Label>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                        {headlessApiEnabled ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="text-sm">
                                            Headless API:{" "}
                                            {headlessApiEnabled
                                                ? "Enabled"
                                                : "Not configured"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                                        {externalStorageEnabled ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="text-sm">
                                            External Storage:{" "}
                                            {externalStorageEnabled
                                                ? "Enabled"
                                                : "Not configured"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Environment Variables */}
                            <div className="space-y-3 pt-4 border-t">
                                <Label className="text-sm font-medium">
                                    Environment Variables
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Configure these in your .env.local or
                                    deployment environment:
                                </p>
                                <div className="p-3 bg-muted rounded-lg font-mono text-xs space-y-2 overflow-x-auto">
                                    <div className="text-muted-foreground">
                                        # Headless API Authentication
                                    </div>
                                    <div>HEADLESS_API_KEY=your-secret-key</div>
                                    <div className="text-muted-foreground mt-3">
                                        # External Storage (Webhook)
                                    </div>
                                    <div>EXTERNAL_STORAGE_ENABLED=true</div>
                                    <div>
                                        EXTERNAL_STORAGE_ENDPOINT_URL=https://your-api.com/save
                                    </div>
                                    <div>EXTERNAL_STORAGE_METHOD=POST</div>
                                    <div>
                                        {`EXTERNAL_STORAGE_HEADERS={"Authorization": "Bearer token"}`}
                                    </div>
                                    <div>
                                        {`EXTERNAL_STORAGE_MAPPING={"content": "$xml", "title": "$filename"}`}
                                    </div>
                                </div>
                            </div>

                            {/* API Endpoints */}
                            <div className="space-y-3 pt-4 border-t">
                                <Label className="text-sm font-medium">
                                    API Endpoints
                                </Label>
                                <div className="space-y-2">
                                    <div className="p-3 bg-muted rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Generate Diagram
                                        </div>
                                        <code className="font-mono text-sm break-all">
                                            POST {getFullApiEndpoint()}
                                        </code>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Save to External Storage
                                        </div>
                                        <code className="font-mono text-sm break-all">
                                            POST {getExternalSaveEndpoint()}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Example cURL */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">
                                        Example Request
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyExample(exampleCurl)}
                                    >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                                <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                                    {exampleCurl}
                                </pre>
                            </div>
                        </div>
                    )}

                    {activeTab === "documentation" && (
                        <div className="swagger-wrapper">
                            <style jsx global>{`
                                .swagger-wrapper .swagger-ui {
                                    font-family: inherit;
                                }
                                .swagger-wrapper .swagger-ui .info {
                                    margin: 0;
                                }
                                .swagger-wrapper .swagger-ui .scheme-container {
                                    padding: 15px 0;
                                    background: transparent;
                                }
                                .swagger-wrapper .swagger-ui .opblock-tag {
                                    border-bottom: 1px solid var(--border);
                                }
                                .swagger-wrapper .swagger-ui .opblock {
                                    border-radius: 8px;
                                    margin-bottom: 8px;
                                }
                                .swagger-wrapper .swagger-ui .btn {
                                    border-radius: 6px;
                                }
                                .swagger-wrapper
                                    .swagger-ui
                                    .opblock.opblock-post {
                                    background: rgba(73, 204, 144, 0.1);
                                    border-color: rgba(73, 204, 144, 0.5);
                                }
                                .dark
                                    .swagger-wrapper
                                    .swagger-ui
                                    .opblock.opblock-post {
                                    background: rgba(73, 204, 144, 0.15);
                                }
                            `}</style>
                            <SwaggerUI url={`${getBasePath()}/openapi.json`} />
                            <div className="mt-4 flex justify-center">
                                <a
                                    href={`${getBasePath()}/openapi.json`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View OpenAPI Spec
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
