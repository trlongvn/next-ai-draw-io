"use client"

/**
 * SQL Generators for DrawDB Schemas
 * Generate SQL scripts for different database systems
 */

import type { DrawDBSchema, DrawDBTable, DrawDBField } from "./drawdb-utils"

// ==================== Types ====================

export type SupportedDatabase = "postgresql" | "mssql"

export interface SQLGeneratorOptions {
    includeDropStatements?: boolean
    includeComments?: boolean
}

// ==================== Utilities ====================

/**
 * Escape SQL identifier (table/column names)
 */
function escapeIdentifier(name: string, database: SupportedDatabase): string {
    if (database === "postgresql") {
        // PostgreSQL uses double quotes for identifiers
        return `"${name.replace(/"/g, '""')}"`
    } else {
        // MSSQL uses square brackets
        return `[${name.replace(/]/g, "]]")}]`
    }
}

/**
 * Map DrawDB field types to PostgreSQL types
 */
function mapToPostgreSQLType(field: DrawDBField): string {
    const type = field.type.toUpperCase()
    
    // Handle auto-increment
    if (field.increment) {
        if (type.includes("BIGINT")) return "BIGSERIAL"
        if (type.includes("SMALLINT")) return "SMALLSERIAL"
        return "SERIAL"
    }
    
    // Direct mappings
    const typeMap: Record<string, string> = {
        "INT": "INTEGER",
        "BOOL": "BOOLEAN",
        "DATETIME": "TIMESTAMP",
        "BLOB": "BYTEA",
    }
    
    return typeMap[type] || field.type
}

/**
 * Map DrawDB field types to MSSQL types
 */
function mapToMSSQLType(field: DrawDBField): string {
    const type = field.type.toUpperCase()
    
    // Type mappings
    const typeMap: Record<string, string> = {
        "SERIAL": "INT",
        "BIGSERIAL": "BIGINT",
        "SMALLSERIAL": "SMALLINT",
        "TEXT": "NVARCHAR(MAX)",
        "BOOLEAN": "BIT",
        "BOOL": "BIT",
        "TIMESTAMP": "DATETIME2",
        "TIMESTAMPTZ": "DATETIMEOFFSET",
        "DATETIME": "DATETIME2",
        "JSON": "NVARCHAR(MAX)", // MSSQL 2016+ has JSON support with NVARCHAR
        "JSONB": "NVARCHAR(MAX)",
        "BLOB": "VARBINARY(MAX)",
        "BYTEA": "VARBINARY(MAX)",
        "UUID": "UNIQUEIDENTIFIER",
    }
    
    // Check for VARCHAR/CHAR to ensure NVARCHAR is used
    if (type.startsWith("VARCHAR")) {
        return type.replace("VARCHAR", "NVARCHAR")
    }
    if (type.startsWith("CHAR") && !type.startsWith("CHARACTER")) {
        return type.replace("CHAR", "NCHAR")
    }
    
    return typeMap[type] || field.type
}

// ==================== PostgreSQL Generator ====================

/**
 * Generate PostgreSQL CREATE TABLE statement
 */
function generatePostgreSQLTable(table: DrawDBTable): string[] {
    const lines: string[] = []
    const tableName = escapeIdentifier(table.name, "postgresql")
    
    lines.push(`CREATE TABLE ${tableName} (`)
    
    const columnDefs: string[] = []
    const constraints: string[] = []
    
    // Generate column definitions
    for (const field of table.fields) {
        const colName = escapeIdentifier(field.name, "postgresql")
        const colType = mapToPostgreSQLType(field)
        const parts = [colName, colType]
        
        // Primary key
        if (field.primary) {
            parts.push("PRIMARY KEY")
        }
        
        // Unique constraint
        if (field.unique && !field.primary) {
            parts.push("UNIQUE")
        }
        
        // Not null
        if (field.notNull || field.primary) {
            parts.push("NOT NULL")
        }
        
        // Default value
        if (field.default) {
            parts.push(`DEFAULT ${field.default}`)
        }
        
        // Check constraint
        if (field.check) {
            parts.push(`CHECK (${field.check})`)
        }
        
        columnDefs.push("    " + parts.join(" "))
    }
    
    lines.push(columnDefs.join(",\n"))
    
    if (constraints.length > 0) {
        lines.push(",\n" + constraints.join(",\n"))
    }
    
    lines.push(");")
    
    return lines
}

/**
 * Generate PostgreSQL table comments
 */
function generatePostgreSQLComments(table: DrawDBTable): string[] {
    const lines: string[] = []
    const tableName = escapeIdentifier(table.name, "postgresql")
    
    if (table.comment) {
        const comment = table.comment.replace(/'/g, "''")
        lines.push(`COMMENT ON TABLE ${tableName} IS '${comment}';`)
    }
    
    for (const field of table.fields) {
        if (field.comment) {
            const colName = escapeIdentifier(field.name, "postgresql")
            const comment = field.comment.replace(/'/g, "''")
            lines.push(`COMMENT ON COLUMN ${tableName}.${colName} IS '${comment}';`)
        }
    }
    
    return lines
}

/**
 * Generate PostgreSQL CREATE INDEX statements
 */
function generatePostgreSQLIndexes(table: DrawDBTable): string[] {
    const lines: string[] = []
    
    if (!table.indices || table.indices.length === 0) {
        return lines
    }
    
    const tableName = escapeIdentifier(table.name, "postgresql")
    
    for (const index of table.indices) {
        const indexName = escapeIdentifier(index.name, "postgresql")
        const uniqueKeyword = index.unique ? "UNIQUE " : ""
        const columns = index.fields
            .map(fieldId => {
                const field = table.fields.find(f => f.id === fieldId)
                return field ? escapeIdentifier(field.name, "postgresql") : null
            })
            .filter(Boolean)
            .join(", ")
        
        if (columns) {
            lines.push(`CREATE ${uniqueKeyword}INDEX ${indexName} ON ${tableName} (${columns});`)
        }
    }
    
    return lines
}

/**
 * Generate PostgreSQL foreign key constraints
 */
function generatePostgreSQLForeignKeys(schema: DrawDBSchema): string[] {
    const lines: string[] = []
    
    if (!schema.relationships || schema.relationships.length === 0) {
        return lines
    }
    
    for (const rel of schema.relationships) {
        const startTable = schema.tables.find(t => t.id === rel.startTableId)
        const endTable = schema.tables.find(t => t.id === rel.endTableId)
        
        if (!startTable || !endTable) continue
        
        const startField = startTable.fields.find(f => f.id === rel.startFieldId)
        const endField = endTable.fields.find(f => f.id === rel.endFieldId)
        
        if (!startField || !endField) continue
        
        const constraintName = escapeIdentifier(
            rel.name || `fk_${startTable.name}_${endTable.name}`,
            "postgresql"
        )
        const startTableName = escapeIdentifier(startTable.name, "postgresql")
        const endTableName = escapeIdentifier(endTable.name, "postgresql")
        const startColName = escapeIdentifier(startField.name, "postgresql")
        const endColName = escapeIdentifier(endField.name, "postgresql")
        
        let fkStatement = `ALTER TABLE ${startTableName} ADD CONSTRAINT ${constraintName} `
        fkStatement += `FOREIGN KEY (${startColName}) REFERENCES ${endTableName} (${endColName})`
        
        if (rel.updateConstraint) {
            fkStatement += ` ON UPDATE ${rel.updateConstraint.toUpperCase()}`
        }
        if (rel.deleteConstraint) {
            fkStatement += ` ON DELETE ${rel.deleteConstraint.toUpperCase()}`
        }
        
        lines.push(fkStatement + ";")
    }
    
    return lines
}

/**
 * Generate complete PostgreSQL SQL script
 */
export function generatePostgreSQLScript(
    schema: DrawDBSchema,
    options: SQLGeneratorOptions = {}
): string {
    const { includeDropStatements = false, includeComments = true } = options
    const lines: string[] = []
    
    lines.push("-- PostgreSQL Schema Export")
    lines.push(`-- Generated: ${new Date().toISOString()}`)
    lines.push("")
    
    // Drop statements
    if (includeDropStatements) {
        lines.push("-- Drop existing tables")
        for (const table of schema.tables.reverse()) {
            const tableName = escapeIdentifier(table.name, "postgresql")
            lines.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`)
        }
        schema.tables.reverse() // restore order
        lines.push("")
    }
    
    // Create tables
    lines.push("-- Create tables")
    for (const table of schema.tables) {
        lines.push(...generatePostgreSQLTable(table))
        lines.push("")
    }
    
    // Create indexes
    const hasIndexes = schema.tables.some(t => t.indices && t.indices.length > 0)
    if (hasIndexes) {
        lines.push("-- Create indexes")
        for (const table of schema.tables) {
            const indexes = generatePostgreSQLIndexes(table)
            if (indexes.length > 0) {
                lines.push(...indexes)
                lines.push("")
            }
        }
    }
    
    // Foreign keys
    if (schema.relationships && schema.relationships.length > 0) {
        lines.push("-- Add foreign key constraints")
        lines.push(...generatePostgreSQLForeignKeys(schema))
        lines.push("")
    }
    
    // Comments
    if (includeComments) {
        const hasComments = schema.tables.some(
            t => t.comment || t.fields.some(f => f.comment)
        )
        if (hasComments) {
            lines.push("-- Add comments")
            for (const table of schema.tables) {
                const comments = generatePostgreSQLComments(table)
                if (comments.length > 0) {
                    lines.push(...comments)
                    lines.push("")
                }
            }
        }
    }
    
    return lines.join("\n")
}

// ==================== MSSQL Generator ====================

/**
 * Generate MSSQL CREATE TABLE statement
 */
function generateMSSQLTable(table: DrawDBTable): string[] {
    const lines: string[] = []
    const tableName = escapeIdentifier(table.name, "mssql")
    
    lines.push(`CREATE TABLE ${tableName} (`)
    
    const columnDefs: string[] = []
    
    // Generate column definitions
    for (const field of table.fields) {
        const colName = escapeIdentifier(field.name, "mssql")
        const colType = mapToMSSQLType(field)
        const parts = [colName, colType]
        
        // Identity (auto-increment)
        if (field.increment) {
            parts.push("IDENTITY(1,1)")
        }
        
        // Primary key
        if (field.primary) {
            parts.push("PRIMARY KEY")
        }
        
        // Unique constraint
        if (field.unique && !field.primary) {
            parts.push("UNIQUE")
        }
        
        // Not null
        if (field.notNull || field.primary) {
            parts.push("NOT NULL")
        } else {
            parts.push("NULL")
        }
        
        // Default value
        if (field.default) {
            parts.push(`DEFAULT ${field.default}`)
        }
        
        // Check constraint
        if (field.check) {
            parts.push(`CHECK (${field.check})`)
        }
        
        columnDefs.push("    " + parts.join(" "))
    }
    
    lines.push(columnDefs.join(",\n"))
    lines.push(");")
    
    return lines
}

/**
 * Generate MSSQL extended properties for comments
 */
function generateMSSQLComments(table: DrawDBTable): string[] {
    const lines: string[] = []
    const tableName = table.name
    
    if (table.comment) {
        const comment = table.comment.replace(/'/g, "''")
        lines.push(
            `EXEC sp_addextendedproperty ` +
            `@name = N'MS_Description', @value = N'${comment}', ` +
            `@level0type = N'SCHEMA', @level0name = N'dbo', ` +
            `@level1type = N'TABLE', @level1name = N'${tableName}';`
        )
    }
    
    for (const field of table.fields) {
        if (field.comment) {
            const comment = field.comment.replace(/'/g, "''")
            lines.push(
                `EXEC sp_addextendedproperty ` +
                `@name = N'MS_Description', @value = N'${comment}', ` +
                `@level0type = N'SCHEMA', @level0name = N'dbo', ` +
                `@level1type = N'TABLE', @level1name = N'${tableName}', ` +
                `@level2type = N'COLUMN', @level2name = N'${field.name}';`
            )
        }
    }
    
    return lines
}

/**
 * Generate MSSQL CREATE INDEX statements
 */
function generateMSSQLIndexes(table: DrawDBTable): string[] {
    const lines: string[] = []
    
    if (!table.indices || table.indices.length === 0) {
        return lines
    }
    
    const tableName = escapeIdentifier(table.name, "mssql")
    
    for (const index of table.indices) {
        const indexName = escapeIdentifier(index.name, "mssql")
        const uniqueKeyword = index.unique ? "UNIQUE " : ""
        const columns = index.fields
            .map(fieldId => {
                const field = table.fields.find(f => f.id === fieldId)
                return field ? escapeIdentifier(field.name, "mssql") : null
            })
            .filter(Boolean)
            .join(", ")
        
        if (columns) {
            lines.push(`CREATE ${uniqueKeyword}INDEX ${indexName} ON ${tableName} (${columns});`)
        }
    }
    
    return lines
}

/**
 * Generate MSSQL foreign key constraints
 */
function generateMSSQLForeignKeys(schema: DrawDBSchema): string[] {
    const lines: string[] = []
    
    if (!schema.relationships || schema.relationships.length === 0) {
        return lines
    }
    
    for (const rel of schema.relationships) {
        const startTable = schema.tables.find(t => t.id === rel.startTableId)
        const endTable = schema.tables.find(t => t.id === rel.endTableId)
        
        if (!startTable || !endTable) continue
        
        const startField = startTable.fields.find(f => f.id === rel.startFieldId)
        const endField = endTable.fields.find(f => f.id === rel.endFieldId)
        
        if (!startField || !endField) continue
        
        const constraintName = escapeIdentifier(
            rel.name || `FK_${startTable.name}_${endTable.name}`,
            "mssql"
        )
        const startTableName = escapeIdentifier(startTable.name, "mssql")
        const endTableName = escapeIdentifier(endTable.name, "mssql")
        const startColName = escapeIdentifier(startField.name, "mssql")
        const endColName = escapeIdentifier(endField.name, "mssql")
        
        let fkStatement = `ALTER TABLE ${startTableName} ADD CONSTRAINT ${constraintName} `
        fkStatement += `FOREIGN KEY (${startColName}) REFERENCES ${endTableName} (${endColName})`
        
        if (rel.updateConstraint) {
            fkStatement += ` ON UPDATE ${rel.updateConstraint.toUpperCase()}`
        }
        if (rel.deleteConstraint) {
            fkStatement += ` ON DELETE ${rel.deleteConstraint.toUpperCase()}`
        }
        
        lines.push(fkStatement + ";")
    }
    
    return lines
}

/**
 * Generate complete MSSQL SQL script
 */
export function generateMSSQLScript(
    schema: DrawDBSchema,
    options: SQLGeneratorOptions = {}
): string {
    const { includeDropStatements = false, includeComments = true } = options
    const lines: string[] = []
    
    lines.push("-- MSSQL Schema Export")
    lines.push(`-- Generated: ${new Date().toISOString()}`)
    lines.push("")
    
    // Drop statements
    if (includeDropStatements) {
        lines.push("-- Drop existing tables")
        for (const table of schema.tables.reverse()) {
            const tableName = escapeIdentifier(table.name, "mssql")
            lines.push(`IF OBJECT_ID('${table.name}', 'U') IS NOT NULL DROP TABLE ${tableName};`)
        }
        schema.tables.reverse() // restore order
        lines.push("")
    }
    
    // Create tables
    lines.push("-- Create tables")
    for (const table of schema.tables) {
        lines.push(...generateMSSQLTable(table))
        lines.push("")
    }
    
    // Create indexes
    const hasIndexes = schema.tables.some(t => t.indices && t.indices.length > 0)
    if (hasIndexes) {
        lines.push("-- Create indexes")
        for (const table of schema.tables) {
            const indexes = generateMSSQLIndexes(table)
            if (indexes.length > 0) {
                lines.push(...indexes)
                lines.push("")
            }
        }
    }
    
    // Foreign keys
    if (schema.relationships && schema.relationships.length > 0) {
        lines.push("-- Add foreign key constraints")
        lines.push(...generateMSSQLForeignKeys(schema))
        lines.push("")
    }
    
    // Comments
    if (includeComments) {
        const hasComments = schema.tables.some(
            t => t.comment || t.fields.some(f => f.comment)
        )
        if (hasComments) {
            lines.push("-- Add extended properties (comments)")
            for (const table of schema.tables) {
                const comments = generateMSSQLComments(table)
                if (comments.length > 0) {
                    lines.push(...comments)
                    lines.push("")
                }
            }
        }
    }
    
    return lines.join("\n")
}

/**
 * Generate SQL script for any supported database
 */
export function generateSQLScript(
    schema: DrawDBSchema,
    database: SupportedDatabase,
    options: SQLGeneratorOptions = {}
): string {
    if (database === "postgresql") {
        return generatePostgreSQLScript(schema, options)
    } else if (database === "mssql") {
        return generateMSSQLScript(schema, options)
    }
    throw new Error(`Unsupported database: ${database}`)
}
