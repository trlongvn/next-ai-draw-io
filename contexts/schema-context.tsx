"use client"

import type React from "react"
import { createContext, useCallback, useContext, useRef, useState } from "react"
import { toast } from "sonner"
import type { ExportFormat } from "@/components/save-dialog"
import type { DrawDBSchema } from "@/lib/drawdb-utils"
import { validateDrawDBSchema } from "@/lib/drawdb-utils"
import { generateSQLScript, type SupportedDatabase } from "@/lib/sql-generators"
import type { ERDiagramRef } from "@/components/er-diagram"

interface SchemaContextType {
    currentSchema: DrawDBSchema | null
    schemaJSON: string
    schemaHistory: { json: string; timestamp: number }[]
    loadSchema: (schema: DrawDBSchema, skipValidation?: boolean) => string | null
    clearSchema: () => void
    exportJSON: () => string
    saveSchemaToFile: (filename: string, format: ExportFormat, sessionId?: string, successMessage?: string) => void
    erDiagramRef: React.RefObject<ERDiagramRef | null>
    setERDiagramRef: (ref: React.RefObject<ERDiagramRef | null>) => void
}

const SchemaContext = createContext<SchemaContextType | undefined>(undefined)

export function SchemaProvider({ children }: { children: React.ReactNode }) {
    const [currentSchema, setCurrentSchema] = useState<DrawDBSchema | null>(null)
    const [schemaJSON, setSchemaJSON] = useState("")
    const [schemaHistory, setSchemaHistory] = useState<
        { json: string; timestamp: number }[]
    >([])
    const erDiagramRefInternal = useRef<ERDiagramRef | null>(null)
    const [erDiagramRefState, setERDiagramRefState] = useState<
        React.RefObject<ERDiagramRef | null>
    >(erDiagramRefInternal)

    const loadSchema = useCallback(
        (schema: DrawDBSchema, skipValidation?: boolean): string | null => {
            if (!skipValidation && !validateDrawDBSchema(schema)) {
                return "Invalid schema: missing required tables or fields"
            }

            // Save current schema to history before replacing
            if (currentSchema) {
                setSchemaHistory((prev) => [
                    ...prev,
                    {
                        json: JSON.stringify(currentSchema),
                        timestamp: Date.now(),
                    },
                ])
            }

            setCurrentSchema(schema)
            setSchemaJSON(JSON.stringify(schema, null, 2))

            // Load into ER diagram component if available
            if (erDiagramRefState.current) {
                return erDiagramRefState.current.loadSchema(schema)
            }

            return null
        },
        [currentSchema, erDiagramRefState],
    )

    const clearSchema = useCallback(() => {
        setCurrentSchema(null)
        setSchemaJSON("")
        if (erDiagramRefState.current) {
            erDiagramRefState.current.clearSchema()
        }
    }, [erDiagramRefState])

    const exportJSON = useCallback(() => {
        if (erDiagramRefState.current) {
            return erDiagramRefState.current.exportJSON()
        }
        return JSON.stringify(
            currentSchema || { tables: [], relationships: [] },
            null,
            2,
        )
    }, [currentSchema, erDiagramRefState])

    const setERDiagramRef = useCallback(
        (ref: React.RefObject<ERDiagramRef | null>) => {
            setERDiagramRefState(ref)
        },
        [],
    )

    const saveSchemaToFile = useCallback(
        (filename: string, format: ExportFormat, sessionId?: string, successMessage?: string) => {
            let fileContent: string
            let mimeType: string
            let extension: string

            if (format === "json") {
                fileContent = exportJSON()
                mimeType = "application/json"
                extension = ".json"
            } else if (format === "postgresql-sql") {
                if (!currentSchema) {
                    toast.error("No schema to export")
                    return
                }
                fileContent = generateSQLScript(currentSchema, "postgresql", {
                    includeDropStatements: false,
                    includeComments: true,
                })
                mimeType = "application/sql"
                extension = ".sql"
            } else if (format === "mssql-sql") {
                if (!currentSchema) {
                    toast.error("No schema to export")
                    return
                }
                fileContent = generateSQLScript(currentSchema, "mssql", {
                    includeDropStatements: false,
                    includeComments: true,
                })
                mimeType = "application/sql"
                extension = ".sql"
            } else {
                toast.error(`Unsupported format: ${format}`)
                return
            }

            // Create download
            const blob = new Blob([fileContent], { type: mimeType })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${filename}${extension}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            // Show success toast
            if (successMessage) {
                toast.success(successMessage, {
                    position: "bottom-left",
                    duration: 2500,
                })
            }

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100)
        },
        [currentSchema, exportJSON],
    )

    return (
        <SchemaContext.Provider
            value={{
                currentSchema,
                schemaJSON,
                schemaHistory,
                loadSchema,
                clearSchema,
                exportJSON,
                saveSchemaToFile,
                erDiagramRef: erDiagramRefState,
                setERDiagramRef,
            }}
        >
            {children}
        </SchemaContext.Provider>
    )
}

export function useSchema() {
    const context = useContext(SchemaContext)
    if (!context) {
        throw new Error("useSchema must be used within a SchemaProvider")
    }
    return context
}
