import * as fs from 'fs'
import * as path from 'path'

const dynamicImport = new Function('specifier', 'return import(specifier)') as <T = any>(
  specifier: string
) => Promise<T>

export type ReferenceDocumentType = 'pdf' | 'docx' | 'doc'

export function detectReferenceDocumentType(filePath: string): ReferenceDocumentType | null {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (ext === '.docx') return 'docx'
  if (ext === '.doc') return 'doc'
  return null
}

export function normalizeExtractedText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function extractReferenceSection(text: string): string {
  const headingMatch = /(?:^|\n)\s*(references|bibliography|参考文献|参考资料)\s*[:：]?\s*/i.exec(text)
  if (!headingMatch) return ''
  return text.slice(headingMatch.index + headingMatch[0].length).trim()
}

export function extractReferenceCandidateText(text: string, maxChars = 12000): string {
  const section = extractReferenceSection(text)
  const source = section || text
  return source.slice(Math.max(0, source.length - maxChars))
}

export async function extractTextFromReferenceDocument(filePath: string): Promise<string> {
  const type = detectReferenceDocumentType(filePath)
  if (!type) throw new Error('仅支持 PDF、DOCX、DOC 文件')

  if (type === 'pdf') {
    const pdfjs = await dynamicImport('pdfjs-dist/legacy/build/pdf.mjs')
    const bytes = new Uint8Array(fs.readFileSync(filePath))
    const document = await pdfjs.getDocument({ data: bytes, useWorkerFetch: false }).promise
    const pageTexts: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pageTexts.push(content.items.map((item: any) => item.str || '').join(' '))
    }
    return normalizeExtractedText(pageTexts.join('\n'))
  }

  if (type === 'docx') {
    const mammoth = require('mammoth') as any
    const result = await mammoth.extractRawText({ path: filePath })
    return normalizeExtractedText(result.value || '')
  }

  const WordExtractor = require('word-extractor') as any
  const extractor = new WordExtractor()
  try {
    const doc = await extractor.extract(filePath)
    return normalizeExtractedText(doc.getBody())
  } catch {
    throw new Error('DOC 文档暂时无法提取文本，请另存为 DOCX 后重试')
  }
}
