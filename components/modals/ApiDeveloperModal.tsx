"use client"

import { Copy, ExternalLink, Key, RefreshCw } from "lucide-react"
import dynamic from "next/dynamic"
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
import { Switch } from "@/components/ui/switch"

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

// LocalStorage keys
const API_KEY_STORAGE_KEY = "next-ai-draw-io-headless-api-key"
const API_ENABLED_STORAGE_KEY = "next-ai-draw-io-headless-api-enabled"

interface ApiDeveloperModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Tab type
type TabType = "configuration" | "documentation"

export function ApiDeveloperModal({
    open,
    onOpenChange,
}: ApiDeveloperModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("configuration")
    const [apiKey, setApiKey] = useState("")
    const [apiEnabled, setApiEnabled] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    // Load stored values on mount
    useEffect(() => {
        if (open) {
            const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY) || ""
            const storedEnabled =
                localStorage.getItem(API_ENABLED_STORAGE_KEY) === "true"
            setApiKey(storedKey)
            setApiEnabled(storedEnabled)
        }
    }, [open])

    // Generate a new API key
    // Note: This is client-side key generation for development/testing purposes.
    // For production use, configure HEADLESS_API_KEY environment variable on the server.
    const generateApiKey = () => {
        setIsGenerating(true)
        // Generate a cryptographically secure random key using Web Crypto API
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        const newKey = Array.from(array)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        setApiKey(`naid_${newKey}`)
        setIsGenerating(false)
        toast.success("New API key generated")
    }

    // Copy API key to clipboard
    const copyApiKey = async () => {
        if (!apiKey) return
        try {
            await navigator.clipboard.writeText(apiKey)
            toast.success("API key copied to clipboard")
        } catch {
            toast.error("Failed to copy API key")
        }
    }

    // Save configuration
    const saveConfiguration = () => {
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey)
        localStorage.setItem(API_ENABLED_STORAGE_KEY, String(apiEnabled))
        toast.success("API configuration saved")
    }

    // Revoke API key
    const revokeApiKey = () => {
        setApiKey("")
        localStorage.removeItem(API_KEY_STORAGE_KEY)
        toast.success("API key revoked")
    }

    // Get the current origin for the API endpoint
    const getApiEndpoint = () => {
        if (typeof window === "undefined") return "/api/v1/generate"
        return `${window.location.origin}/api/v1/generate`
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Developer Tools
                    </DialogTitle>
                    <DialogDescription>
                        Configure and test the headless diagram generation API
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
                            {/* Enable API Toggle */}
                            <div className="flex items-center justify-between py-3 border-b">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">
                                        Enable Headless API
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Allow external systems to generate
                                        diagrams via API
                                    </p>
                                </div>
                                <Switch
                                    checked={apiEnabled}
                                    onCheckedChange={setApiEnabled}
                                />
                            </div>

                            {/* API Key Management */}
                            <div className="space-y-3">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">
                                        API Key
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Use this key in the x-api-key header for
                                        authentication
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        type="password"
                                        value={apiKey}
                                        readOnly
                                        placeholder="No API key generated"
                                        className="font-mono text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyApiKey}
                                        disabled={!apiKey}
                                        title="Copy API key"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={generateApiKey}
                                        disabled={isGenerating}
                                        className="flex-1"
                                    >
                                        <RefreshCw
                                            className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`}
                                        />
                                        Generate New Key
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={revokeApiKey}
                                        disabled={!apiKey}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        Revoke Key
                                    </Button>
                                </div>
                            </div>

                            {/* API Endpoint Info */}
                            <div className="space-y-3 pt-4 border-t">
                                <Label className="text-sm font-medium">
                                    API Endpoint
                                </Label>
                                <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                                    {getApiEndpoint()}
                                </div>
                            </div>

                            {/* Example cURL */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">
                                    Example Request
                                </Label>
                                <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                                    {`curl -X POST ${getApiEndpoint()} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey || "<your-api-key>"}" \\
  -d '{
    "prompt": "Create a simple flowchart"
  }'`}
                                </pre>
                            </div>

                            {/* Save Button */}
                            <div className="pt-4">
                                <Button
                                    onClick={saveConfiguration}
                                    className="w-full"
                                >
                                    Save Configuration
                                </Button>
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
                            <SwaggerUI url="/openapi.json" />
                            <div className="mt-4 flex justify-center">
                                <a
                                    href="/openapi.json"
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
