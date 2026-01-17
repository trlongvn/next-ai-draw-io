"use client"

import { Cloud, Settings } from "lucide-react"
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
import {
    getExternalStorageConfig,
    saveToExternal,
} from "@/lib/external-storage"

export type ExportFormat = "drawio" | "png" | "svg"

interface SaveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (filename: string, format: ExportFormat) => void
    defaultFilename: string
    currentXml?: string
    onOpenExternalStorage?: () => void
}

export function SaveDialog({
    open,
    onOpenChange,
    onSave,
    defaultFilename,
    currentXml,
    onOpenExternalStorage,
}: SaveDialogProps) {
    const dict = useDictionary()
    const [filename, setFilename] = useState(defaultFilename)
    const [format, setFormat] = useState<ExportFormat>("drawio")
    const [isSavingToCloud, setIsSavingToCloud] = useState(false)
    const externalConfig = getExternalStorageConfig()

    useEffect(() => {
        if (open) {
            setFilename(defaultFilename)
        }
    }, [open, defaultFilename])

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
            const result = await saveToExternal(currentXml, finalFilename)
            if (result.success) {
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

    const FORMAT_OPTIONS = [
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
                    {/* External Storage Options */}
                    {externalConfig?.enabled && currentXml && (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                onClick={handleSaveToCloud}
                                disabled={isSavingToCloud}
                                className="flex-1 sm:flex-initial"
                            >
                                <Cloud className="h-4 w-4 mr-2" />
                                {isSavingToCloud
                                    ? "Saving..."
                                    : dict.save?.saveToCloud || "Save to Cloud"}
                            </Button>
                            {onOpenExternalStorage && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        onOpenChange(false)
                                        onOpenExternalStorage()
                                    }}
                                    title={
                                        dict.save?.configureCloud || "Configure"
                                    }
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                    {!externalConfig?.enabled && onOpenExternalStorage && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                onOpenChange(false)
                                onOpenExternalStorage()
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <Cloud className="h-4 w-4 mr-2" />
                            {dict.save?.setupCloud || "Setup Cloud Save"}
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
