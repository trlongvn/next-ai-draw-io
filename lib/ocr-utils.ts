"use client"

import Tesseract, { createWorker, type Worker, type Block, type Paragraph, type Line } from "tesseract.js"

// Supported languages for OCR
export const OCR_LANGUAGES = "eng+vie" // English + Vietnamese

// Minimum characters threshold to consider PDF as having text (not scanned)
export const MIN_TEXT_THRESHOLD = 50

// Supported image formats for OCR
const OCR_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"]
const OCR_IMAGE_MIME_TYPES = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/bmp",
    "image/tiff",
]

// Singleton worker for reuse
let ocrWorker: Worker | null = null
let isWorkerInitializing = false
let workerInitPromise: Promise<Worker> | null = null

/**
 * OCR Result with layout information
 */
export interface OcrResult {
    text: string              // Plain text (layout-aware)
    confidence: number        // Overall confidence (0-100)
    blocks: OcrBlock[]        // Document blocks with structure
}

export interface OcrBlock {
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    paragraphs: OcrParagraph[]
}

export interface OcrParagraph {
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
    lines: OcrLine[]
}

export interface OcrLine {
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
}

/**
 * Get or create OCR worker (singleton pattern for efficiency)
 */
async function getOcrWorker(): Promise<Worker> {
    if (ocrWorker) {
        return ocrWorker
    }

    if (isWorkerInitializing && workerInitPromise) {
        return workerInitPromise
    }

    isWorkerInitializing = true
    workerInitPromise = (async () => {
        const worker = await createWorker(OCR_LANGUAGES, Tesseract.OEM.LSTM_ONLY, {
            // Cache language files in browser
            cacheMethod: "readOnly",
            // Use CDN for language files
            langPath: "https://tessdata.projectnaptha.com/4.0.0",
        })
        ocrWorker = worker
        isWorkerInitializing = false
        return worker
    })()

    return workerInitPromise
}

/**
 * Check if a file is an image that can be processed by OCR
 */
export function isOcrSupportedImage(file: File): boolean {
    const name = file.name.toLowerCase()
    return (
        OCR_IMAGE_MIME_TYPES.includes(file.type) ||
        OCR_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
    )
}

/**
 * Check if a file is an image (but not a scannable one - for existing image handling)
 * This is for regular images that should be sent as-is to AI
 */
export function isRegularImage(file: File): boolean {
    return file.type.startsWith("image/")
}

/**
 * Extract text from an image using Tesseract OCR with layout analysis
 * Supports Vietnamese and English
 * Returns layout-aware text preserving document structure
 */
export async function extractTextFromImage(file: File): Promise<string> {
    const result = await extractTextWithLayout(file)
    return result.text
}

/**
 * Extract text with full layout information
 * Returns structured data with blocks, paragraphs, lines and their bounding boxes
 */
export async function extractTextWithLayout(file: File): Promise<OcrResult> {
    const worker = await getOcrWorker()
    
    // Convert file to data URL for Tesseract
    const dataUrl = await fileToDataUrl(file)
    
    // Perform OCR with layout analysis
    const { data } = await worker.recognize(dataUrl)
    
    // Handle case where blocks is null
    const dataBlocks = data.blocks || []
    
    // Build layout-aware text output
    const layoutText = buildLayoutAwareText(dataBlocks)
    
    // Map Tesseract blocks to our structure
    const blocks: OcrBlock[] = dataBlocks.map((block: Block) => ({
        text: block.text,
        confidence: block.confidence,
        bbox: block.bbox,
        paragraphs: (block.paragraphs || []).map((para: Paragraph) => ({
            text: para.text,
            confidence: para.confidence,
            bbox: para.bbox,
            lines: (para.lines || []).map((line: Line) => ({
                text: line.text,
                confidence: line.confidence,
                bbox: line.bbox,
            })),
        })),
    }))
    
    return {
        text: layoutText,
        confidence: data.confidence,
        blocks,
    }
}

/**
 * Build layout-aware text from blocks
 * Preserves document structure with proper spacing and line breaks
 */
function buildLayoutAwareText(blocks: Block[]): string {
    if (!blocks || blocks.length === 0) {
        return ""
    }
    
    const textParts: string[] = []
    
    // Sort blocks by vertical position (top to bottom), then horizontal (left to right)
    const sortedBlocks = [...blocks].sort((a, b) => {
        const yDiff = a.bbox.y0 - b.bbox.y0
        // If blocks are on similar vertical level, sort by x position
        if (Math.abs(yDiff) < 20) {
            return a.bbox.x0 - b.bbox.x0
        }
        return yDiff
    })
    
    for (const block of sortedBlocks) {
        const blockText = buildBlockText(block)
        if (blockText.trim()) {
            textParts.push(blockText)
        }
    }
    
    // Join blocks with double newline for clear separation
    return textParts.join("\n\n").trim()
}

/**
 * Build text from a single block, preserving paragraph structure
 */
function buildBlockText(block: Block): string {
    if (!block.paragraphs || block.paragraphs.length === 0) {
        return block.text || ""
    }
    
    const paragraphTexts: string[] = []
    
    for (const para of block.paragraphs) {
        const paraText = buildParagraphText(para)
        if (paraText.trim()) {
            paragraphTexts.push(paraText)
        }
    }
    
    return paragraphTexts.join("\n")
}

/**
 * Build text from a paragraph, preserving line structure
 */
function buildParagraphText(para: Paragraph): string {
    if (!para.lines || para.lines.length === 0) {
        return para.text || ""
    }
    
    // Check if lines appear to be in a table-like structure
    // (lines at similar X positions might be columns)
    const lineTexts = para.lines.map((line: Line) => line.text.trim())
    
    // Join lines - use space for continuous text, newline for structured content
    // Detect if content looks like a list or structured format
    const hasListMarkers = lineTexts.some(text => 
        /^[\-\•\*\d+\.\)]\s/.test(text)
    )
    
    if (hasListMarkers) {
        return lineTexts.join("\n")
    }
    
    // For regular paragraphs, join with space
    return lineTexts.join(" ")
}

/**
 * Convert a File to a data URL
 */
function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

/**
 * Terminate the OCR worker (cleanup)
 * Call this when the component unmounts or when OCR is no longer needed
 */
export async function terminateOcrWorker(): Promise<void> {
    if (ocrWorker) {
        await ocrWorker.terminate()
        ocrWorker = null
        workerInitPromise = null
        isWorkerInitializing = false
    }
}

/**
 * Check if extracted text from PDF is likely from a scanned document
 * (very little or no text extracted)
 */
export function isPdfLikelyScanned(extractedText: string): boolean {
    // If text is very short, it's likely a scanned PDF
    const cleanedText = extractedText.replace(/\s+/g, "").trim()
    return cleanedText.length < MIN_TEXT_THRESHOLD
}

