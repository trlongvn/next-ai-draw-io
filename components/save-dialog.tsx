"use client"

import { Cloud } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useDictionary } from "@/hooks/use-dictionary"
import { getSelectedAIConfig } from "@/hooks/use-model-config"
import { getApiEndpoint } from "@/lib/base-path"

export type ExportFormat =
    | "drawio"
    | "png"
    | "svg"
    | "json"
    | "postgresql-sql"
    | "mssql-sql"
    | "uipath-xaml"

interface SaveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (filename: string, format: ExportFormat) => void
    defaultFilename: string
    currentXml?: string
    externalStorageEnabled?: boolean
    editorMode?: "drawio" | "drawdb"
}

export function SaveDialog({
    open,
    onOpenChange,
    onSave,
    defaultFilename,
    currentXml,
    externalStorageEnabled = false,
    editorMode = "drawio",
}: SaveDialogProps) {
    const dict = useDictionary()
    const [filename, setFilename] = useState(defaultFilename)
    // Default format based on editor mode
    const defaultFormat: ExportFormat = editorMode === "drawdb" ? "json" : "drawio"
    const [format, setFormat] = useState<ExportFormat>(defaultFormat)
    const [isSavingToCloud, setIsSavingToCloud] = useState(false)

    useEffect(() => {
        if (open) {
            setFilename(defaultFilename)
            // Reset format to default when dialog opens
            setFormat(defaultFormat)
        }
    }, [open, defaultFilename, defaultFormat])

    const handleSave = () => {
        const finalFilename = filename.trim() || defaultFilename
        onSave(finalFilename, format)
        onOpenChange(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleSave()
        }
    }

    const handleSaveToCloud = async () => {
        if (!currentXml) {
            toast.error("No diagram to save")
            return
        }

        const finalFilename = filename.trim() || defaultFilename
        setIsSavingToCloud(true)

        try {
            const config = getSelectedAIConfig()
            const response = await fetch(
                getApiEndpoint("/api/v1/external-save"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(config.accessCode && {
                            "x-access-code": config.accessCode,
                        }),
                    },
                    body: JSON.stringify({
                        xml: currentXml,
                        filename: finalFilename,
                    }),
                },
            )

            const result = await response.json()

            if (result.status === "success") {
                toast.success(
                    dict.save?.savedToCloud || "Saved to cloud successfully",
                )
                onOpenChange(false)
            } else {
                toast.error(result.error || "Failed to save to cloud")
            }
        } catch {
            toast.error("Failed to save to cloud")
        } finally {
            setIsSavingToCloud(false)
        }
    }

    // Format options based on editor mode
    const FORMAT_OPTIONS = editorMode === "drawdb" ? [
        {
            value: "json" as const,
            label: dict.save.formats.json || "JSON Schema",
            extension: ".json",
        },
        {
            value: "postgresql-sql" as const,
            label: dict.save.formats.postgresqlSql || "PostgreSQL SQL",
            extension: ".sql",
        },
        {
            value: "mssql-sql" as const,
            label: dict.save.formats.mssqlSql || "MSSQL SQL",
            extension: ".sql",
        },
    ] : [
        {
            value: "drawio" as const,
            label: dict.save.formats.drawio,
            extension: ".drawio",
        },
        {
            value: "png" as const,
            label: dict.save.formats.png,
            extension: ".png",
        },
        {
            value: "svg" as const,
            label: dict.save.formats.svg,
            extension: ".svg",
        },
        {
            value: "uipath-xaml" as const,
            label: dict.save.formats.uipathXaml || "UiPath Workflow",
            extension: ".xaml",
        },
    ]

    const currentFormat = FORMAT_OPTIONS.find((f) => f.value === format)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{dict.save.title}</DialogTitle>
                    <DialogDescription>
                        {dict.save.description}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {dict.save.format}
                        </label>
                        <Select
                            value={format}
                            onValueChange={(v) => setFormat(v as ExportFormat)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {FORMAT_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {dict.save.filename}
                        </label>
                        <div className="flex items-stretch">
                            <Input
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={dict.save.filenamePlaceholder}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                className="rounded-r-none border-r-0 focus-visible:z-10"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground font-mono">
                                {currentFormat?.extension || ".drawio"}
                            </span>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-col gap-3 sm:flex-row">
                    {/* External Storage - only shown if enabled via env vars */}
                    {externalStorageEnabled && currentXml && (
                        <Button
                            variant="outline"
                            onClick={handleSaveToCloud}
                            disabled={isSavingToCloud}
                            className="w-full sm:w-auto"
                        >
                            <Cloud className="h-4 w-4 mr-2" />
                            {isSavingToCloud
                                ? "Saving..."
                                : dict.save?.saveToCloud || "Save to Cloud"}
                        </Button>
                    )}
                    <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            {dict.common.cancel}
                        </Button>
                        <Button onClick={handleSave}>{dict.common.save}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
