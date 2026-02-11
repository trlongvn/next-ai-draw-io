"use client"

/**
 * DrawDB Utilities
 * Types and functions for communicating with DrawDB iframe
 */

// ==================== Types ====================

/**
 * DrawDB field definition
 */
export interface DrawDBField {
    id: string
    name: string
    type: string
    default?: string
    check?: string
    primary?: boolean
    unique?: boolean
    notNull?: boolean
    increment?: boolean
    comment?: string
}

/**
 * DrawDB table definition
 */
export interface DrawDBTable {
    id: string
    name: string
    x: number
    y: number
    fields: DrawDBField[]
    color?: string
    comment?: string
    indices?: Array<{
        id: string
        name: string
        unique: boolean
        fields: string[]
    }>
}

/**
 * DrawDB relationship definition
 */
export interface DrawDBRelationship {
    id: string
    name?: string
    startTableId: string
    endTableId: string
    startFieldId: string
    endFieldId: string
    cardinality?: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many"
    updateConstraint?: string
    deleteConstraint?: string
}

/**
 * Complete DrawDB schema
 */
export interface DrawDBSchema {
    database?: "mysql" | "postgresql" | "sqlite" | "mariadb" | "mssql" | "generic"
    tables: DrawDBTable[]
    relationships: DrawDBRelationship[]
    notes?: Array<{
        id: string
        content: string
        x: number
        y: number
    }>
}

// ==================== PostMessage Types ====================

export type DrawDBMessageType =
    | "LOAD_SCHEMA"
    | "EXPORT_SQL"
    | "EXPORT_JSON"
    | "CLEAR_SCHEMA"
    | "SCHEMA_LOADED"
    | "SQL_EXPORTED"
    | "JSON_EXPORTED"

export interface DrawDBMessage {
    type: DrawDBMessageType
    schema?: DrawDBSchema
    sql?: string
    error?: string
}

// ==================== Validation ====================

/**
 * Validate DrawDB schema structure
 */
export function validateDrawDBSchema(schema: unknown): schema is DrawDBSchema {
    if (!schema || typeof schema !== "object") return false
    
    const s = schema as DrawDBSchema
    
    // Must have tables array
    if (!Array.isArray(s.tables)) return false
    
    // Validate each table
    for (const table of s.tables) {
        if (!table.id || !table.name || !Array.isArray(table.fields)) {
            return false
        }
        // Validate fields
        for (const field of table.fields) {
            if (!field.id || !field.name || !field.type) {
                return false
            }
        }
    }
    
    // Relationships are optional but must be valid if present
    if (s.relationships && !Array.isArray(s.relationships)) {
        return false
    }
    
    return true
}

/**
 * Generate unique ID for DrawDB entities
 */
export function generateDrawDBId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ==================== Auto-Layout ====================

/**
 * Calculate positions for tables in a grid layout
 * @param tableCount Number of tables to position
 * @param startX Starting X coordinate
 * @param startY Starting Y coordinate
 * @param tableWidth Approximate table width
 * @param tableHeight Approximate table height
 * @param gap Gap between tables
 */
export function calculateTablePositions(
    tableCount: number,
    startX = 50,
    startY = 50,
    tableWidth = 200,
    tableHeight = 150,
    gap = 50
): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = []
    const columns = Math.ceil(Math.sqrt(tableCount))
    
    for (let i = 0; i < tableCount; i++) {
        const row = Math.floor(i / columns)
        const col = i % columns
        positions.push({
            x: startX + col * (tableWidth + gap),
            y: startY + row * (tableHeight + gap),
        })
    }
    
    return positions
}

/**
 * Apply auto-layout to schema tables
 */
export function applyAutoLayout(schema: DrawDBSchema): DrawDBSchema {
    const positions = calculateTablePositions(schema.tables.length)
    
    return {
        ...schema,
        tables: schema.tables.map((table, index) => ({
            ...table,
            x: positions[index]?.x ?? 50,
            y: positions[index]?.y ?? 50,
        })),
    }
}

// ==================== Schema Helpers ====================

/**
 * Create an empty DrawDB schema
 */
export function createEmptySchema(database: DrawDBSchema["database"] = "postgresql"): DrawDBSchema {
    return {
        database,
        tables: [],
        relationships: [],
    }
}

/**
 * Parse LLM response to DrawDB schema
 * Handles JSON extraction from markdown code blocks
 */
export function parseLLMSchemaResponse(response: string): DrawDBSchema | null {
    try {
        // Try to extract JSON from code blocks
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim()
        
        const parsed = JSON.parse(jsonStr)
        
        // Ensure all entities have IDs
        const schema = ensureSchemaIds(parsed)
        
        if (validateDrawDBSchema(schema)) {
            return applyAutoLayout(schema)
        }
        
        return null
    } catch {
        return null
    }
}

/**
 * Ensure all schema entities have unique IDs
 */
function ensureSchemaIds(schema: DrawDBSchema): DrawDBSchema {
    const tableIdMap = new Map<string, string>()
    const fieldIdMap = new Map<string, Map<string, string>>()
    
    const tables = schema.tables.map((table) => {
        const tableId = table.id || generateDrawDBId()
        tableIdMap.set(table.name, tableId)
        
        const fieldMap = new Map<string, string>()
        fieldIdMap.set(tableId, fieldMap)
        
        const fields = table.fields.map((field) => {
            const fieldId = field.id || generateDrawDBId()
            fieldMap.set(field.name, fieldId)
            return { ...field, id: fieldId }
        })
        
        return {
            ...table,
            id: tableId,
            fields,
            x: table.x ?? 0,
            y: table.y ?? 0,
        }
    })
    
    // Update relationship IDs to use actual table/field IDs
    const relationships = (schema.relationships || []).map((rel) => ({
        ...rel,
        id: rel.id || generateDrawDBId(),
    }))
    
    return {
        ...schema,
        tables,
        relationships,
    }
}

// ==================== SQL Type Mapping ====================

export const DATA_TYPES: Record<string, string[]> = {
    postgresql: [
        "INT", "BIGINT", "SMALLINT", "SERIAL", "BIGSERIAL",
        "VARCHAR", "TEXT", "CHAR",
        "BOOLEAN",
        "DATE", "TIMESTAMP", "TIMESTAMPTZ", "TIME",
        "DECIMAL", "NUMERIC", "REAL", "DOUBLE PRECISION",
        "UUID", "JSON", "JSONB",
    ],
    mysql: [
        "INT", "BIGINT", "SMALLINT", "TINYINT", "MEDIUMINT",
        "VARCHAR", "TEXT", "CHAR", "LONGTEXT",
        "BOOLEAN",
        "DATE", "DATETIME", "TIMESTAMP", "TIME",
        "DECIMAL", "FLOAT", "DOUBLE",
        "JSON", "BLOB",
    ],
    sqlite: [
        "INTEGER", "REAL", "TEXT", "BLOB", "NUMERIC",
    ],
}
