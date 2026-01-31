import { describe, expect, it } from "vitest"
import { isDocxFile, isExcelFile, isPdfFile, isTextFile } from "@/lib/pdf-utils"

describe("File Type Detection", () => {
    it("should detect DOCX files", () => {
        // Test with DOCX extension
        const docxFile = new File(["content"], "test.docx", {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
        expect(isDocxFile(docxFile)).toBe(true)

        // Test with .doc extension
        const docFile = new File(["content"], "test.doc", {
            type: "application/msword",
        })
        expect(isDocxFile(docFile)).toBe(true)

        // Test by file name only
        const docxFileByName = new File(["content"], "test.docx")
        expect(isDocxFile(docxFileByName)).toBe(true)
    })

    it("should detect Excel files", () => {
        // Test with XLSX extension
        const xlsxFile = new File(["content"], "test.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
        expect(isExcelFile(xlsxFile)).toBe(true)

        // Test with XLS extension
        const xlsFile = new File(["content"], "test.xls", {
            type: "application/vnd.ms-excel",
        })
        expect(isExcelFile(xlsFile)).toBe(true)

        // Test with CSV extension
        const csvFile = new File(["content"], "test.csv", {
            type: "text/csv",
        })
        expect(isExcelFile(csvFile)).toBe(true)

        // Test by file name only
        const xlsxFileByName = new File(["content"], "test.xlsx")
        expect(isExcelFile(xlsxFileByName)).toBe(true)
    })

    it("should detect PDF files", () => {
        const pdfFile = new File(["content"], "test.pdf", {
            type: "application/pdf",
        })
        expect(isPdfFile(pdfFile)).toBe(true)
    })

    it("should detect text files", () => {
        const txtFile = new File(["content"], "test.txt", {
            type: "text/plain",
        })
        expect(isTextFile(txtFile)).toBe(true)

        const jsonFile = new File(["content"], "test.json", {
            type: "application/json",
        })
        expect(isTextFile(jsonFile)).toBe(true)

        const mdFile = new File(["content"], "test.md")
        expect(isTextFile(mdFile)).toBe(true)
    })

    it("should not misidentify file types", () => {
        const docxFile = new File(["content"], "test.docx")
        expect(isPdfFile(docxFile)).toBe(false)
        expect(isExcelFile(docxFile)).toBe(false)

        const excelFile = new File(["content"], "test.xlsx")
        expect(isPdfFile(excelFile)).toBe(false)
        expect(isDocxFile(excelFile)).toBe(false)
    })
})
