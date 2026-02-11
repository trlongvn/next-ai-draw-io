"use client"

import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useMemo,
    useState,
} from "react"
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Handle,
    Position,
    type Node,
    type Edge,
    type NodeProps,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import type { DrawDBSchema, DrawDBTable, DrawDBField } from "@/lib/drawdb-utils"
import { validateDrawDBSchema } from "@/lib/drawdb-utils"
import { generateSQLScript, type SupportedDatabase } from "@/lib/sql-generators"

// ============================================================
// Custom Table Node
// ============================================================

interface TableNodeData {
    label: string
    fields: DrawDBField[]
    color?: string
    comment?: string
    database?: string
    [key: string]: unknown
}

function TableNodeComponent({ data, selected }: NodeProps<Node<TableNodeData>>) {
    const headerColor = data.color || "#4f46e5"

    return (
        <div
            className={`rounded-lg overflow-hidden shadow-lg border-2 transition-shadow min-w-[220px] ${
                selected
                    ? "border-blue-500 shadow-blue-500/25"
                    : "border-border/50 shadow-md"
            }`}
            style={{ background: "var(--er-node-bg, #ffffff)" }}
        >
            {/* Table Header */}
            <div
                className="px-3 py-2 font-semibold text-white text-sm flex items-center gap-2"
                style={{ background: headerColor }}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                {data.label}
            </div>

            {/* Fields */}
            <div className="divide-y divide-border/30">
                {data.fields.map((field, idx) => (
                    <div
                        key={field.id || idx}
                        className="px-3 py-1.5 flex items-center gap-2 text-xs hover:bg-muted/50 relative"
                        style={{ color: "var(--er-text, #1f2937)" }}
                    >
                        {/* Connection handles for each field */}
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`${field.id}-target`}
                            style={{
                                top: "50%",
                                background: "#6366f1",
                                width: 8,
                                height: 8,
                                border: "2px solid white",
                            }}
                        />
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`${field.id}-source`}
                            style={{
                                top: "50%",
                                background: "#6366f1",
                                width: 8,
                                height: 8,
                                border: "2px solid white",
                            }}
                        />

                        {/* PK / FK badges */}
                        <span className="flex gap-0.5 w-10 shrink-0">
                            {field.primary && (
                                <span
                                    className="text-[9px] font-bold px-1 rounded"
                                    style={{
                                        background: "#fbbf24",
                                        color: "#78350f",
                                    }}
                                >
                                    PK
                                </span>
                            )}
                            {field.unique && !field.primary && (
                                <span
                                    className="text-[9px] font-bold px-1 rounded"
                                    style={{
                                        background: "#a78bfa",
                                        color: "#4c1d95",
                                    }}
                                >
                                    UQ
                                </span>
                            )}
                        </span>

                        {/* Field name */}
                        <span
                            className={`flex-1 ${field.primary ? "font-semibold" : ""} ${field.notNull ? "" : "opacity-75"}`}
                        >
                            {field.name}
                        </span>

                        {/* Type */}
                        <span
                            className="text-[10px] font-mono opacity-60 shrink-0"
                        >
                            {field.type}
                        </span>

                        {/* Not null indicator */}
                        {field.notNull && (
                            <span className="text-[9px] text-red-400 font-bold shrink-0">
                                NN
                            </span>
                        )}
                    </div>
                ))}
                {data.fields.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground italic">
                        No fields
                    </div>
                )}
            </div>

            {/* Comment footer */}
            {data.comment && (
                <div
                    className="px-3 py-1 text-[10px] opacity-50 border-t border-border/30 italic"
                    style={{ color: "var(--er-text, #1f2937)" }}
                >
                    {data.comment}
                </div>
            )}
        </div>
    )
}

// ============================================================
// Schema → React Flow conversion
// ============================================================

const CARDINALITY_LABELS: Record<string, { source: string; target: string }> = {
    "one-to-one": { source: "1", target: "1" },
    "one-to-many": { source: "1", target: "∞" },
    "many-to-one": { source: "∞", target: "1" },
    "many-to-many": { source: "∞", target: "∞" },
}

function schemaToFlow(schema: DrawDBSchema): {
    nodes: Node<TableNodeData>[]
    edges: Edge[]
} {
    const nodes: Node<TableNodeData>[] = schema.tables.map((table) => ({
        id: table.id,
        type: "tableNode",
        position: { x: table.x || 0, y: table.y || 0 },
        data: {
            label: table.name,
            fields: table.fields,
            color: table.color,
            comment: table.comment,
            database: schema.database,
        },
    }))

    const edges: Edge[] = (schema.relationships || []).map((rel) => {
        const labels = CARDINALITY_LABELS[rel.cardinality || "one-to-many"]
        return {
            id: rel.id,
            source: rel.startTableId,
            target: rel.endTableId,
            sourceHandle: `${rel.startFieldId}-source`,
            targetHandle: `${rel.endFieldId}-target`,
            type: "smoothstep",
            animated: true,
            label: rel.name || `${labels?.source || "1"} : ${labels?.target || "∞"}`,
            style: { stroke: "#6366f1", strokeWidth: 2 },
            labelStyle: {
                fontSize: 11,
                fontWeight: 600,
                fill: "#6366f1",
            },
            labelBgStyle: {
                fill: "var(--er-node-bg, #ffffff)",
                fillOpacity: 0.9,
            },
        }
    })

    return { nodes, edges }
}

// ============================================================
// Component
// ============================================================

export interface ERDiagramRef {
    loadSchema: (schema: DrawDBSchema) => string | null
    clearSchema: () => void
    getSchema: () => DrawDBSchema | null
    exportJSON: () => string
    exportSQL: (database: SupportedDatabase) => string
}

interface ERDiagramProps {
    darkMode?: boolean
    className?: string
    onSchemaChange?: (schema: DrawDBSchema | null) => void
    schema?: DrawDBSchema | null
}

const nodeTypes = {
    tableNode: TableNodeComponent,
}

export const ERDiagram = forwardRef<ERDiagramRef, ERDiagramProps>(
    function ERDiagram({ darkMode = false, className = "", onSchemaChange, schema }, ref) {
        const [nodes, setNodes, onNodesChange] = useNodesState<Node<TableNodeData>>([])
        const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
        const [currentSchema, setCurrentSchema] = useState<DrawDBSchema | null>(null)

        const loadSchema = useCallback(
            (newSchema: DrawDBSchema): string | null => {
                if (!validateDrawDBSchema(newSchema)) {
                    return "Invalid schema: missing required tables or fields"
                }

                const { nodes: newNodes, edges: newEdges } = schemaToFlow(newSchema)
                setNodes(newNodes)
                setEdges(newEdges)
                setCurrentSchema(newSchema)
                return null // success
            },
            [setNodes, setEdges],
        )

        // Sync with schema prop
        React.useEffect(() => {
            if (schema) {
                loadSchema(schema)
            } else if (schema === null) {
                // Clear if explicitly null (but not undefined)
                setNodes([])
                setEdges([])
                setCurrentSchema(null)
            }
        }, [schema, loadSchema, setNodes, setEdges])

        // Internal imperative load (calls onSchemaChange to notify parent)
        const imperativeLoadSchema = useCallback(
            (newSchema: DrawDBSchema) => {
                const error = loadSchema(newSchema)
                if (!error) {
                    onSchemaChange?.(newSchema)
                }
                return error
            },
            [loadSchema, onSchemaChange],
        )

        const clearSchema = useCallback(() => {
            setNodes([])
            setEdges([])
            setCurrentSchema(null)
            onSchemaChange?.(null)
        }, [setNodes, setEdges, onSchemaChange])

        const getSchema = useCallback(() => currentSchema, [currentSchema])

        const exportJSON = useCallback(
            () => JSON.stringify(currentSchema || { tables: [], relationships: [] }, null, 2),
            [currentSchema],
        )

        const exportSQL = useCallback(
            (database: SupportedDatabase) => {
                if (!currentSchema) {
                    return "-- No schema loaded"
                }
                return generateSQLScript(currentSchema, database, {
                    includeDropStatements: false,
                    includeComments: true,
                })
            },
            [currentSchema],
        )

        useImperativeHandle(ref, () => ({
            loadSchema: imperativeLoadSchema,
            clearSchema,
            getSchema,
            exportJSON,
            exportSQL,
        }))

        const flowStyle = useMemo(
            () =>
                ({
                    "--er-node-bg": darkMode ? "#1e1e2e" : "#ffffff",
                    "--er-text": darkMode ? "#cdd6f4" : "#1f2937",
                }) as React.CSSProperties,
            [darkMode],
        )

        return (
            <div
                className={`h-full w-full ${className}`}
                style={flowStyle}
            >
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    colorMode={darkMode ? "dark" : "light"}
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.1}
                    maxZoom={2}
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={16}
                        size={1}
                        color={darkMode ? "#313244" : "#e5e7eb"}
                    />
                    <Controls
                        showInteractive={false}
                        style={{
                            background: darkMode ? "#1e1e2e" : "#ffffff",
                            border: "1px solid",
                            borderColor: darkMode ? "#45475a" : "#e5e7eb",
                            borderRadius: 8,
                        }}
                    />
                    <MiniMap
                        nodeColor={darkMode ? "#6366f1" : "#818cf8"}
                        maskColor={
                            darkMode
                                ? "rgba(30, 30, 46, 0.8)"
                                : "rgba(255, 255, 255, 0.8)"
                        }
                        style={{
                            background: darkMode ? "#11111b" : "#f9fafb",
                            border: "1px solid",
                            borderColor: darkMode ? "#45475a" : "#e5e7eb",
                            borderRadius: 8,
                        }}
                    />
                    {/* Empty state */}
                    {nodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center text-muted-foreground">
                                <svg
                                    className="mx-auto mb-3 opacity-30"
                                    width="48"
                                    height="48"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                >
                                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                                    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                                    <path d="M3 12A9 3 0 0 0 21 12" />
                                </svg>
                                <p className="text-sm font-medium">
                                    No schema loaded
                                </p>
                                <p className="text-xs mt-1 opacity-70">
                                    Ask the AI to design a database schema
                                </p>
                            </div>
                        </div>
                    )}
                </ReactFlow>
            </div>
        )
    },
)
