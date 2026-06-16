import { describe, expect, it } from 'vitest'
import {
  detectReferenceDocumentType,
  extractReferenceCandidateText,
  extractReferenceSection,
  normalizeExtractedText,
} from '../../src/main/reference-text-extractor'

describe('reference text extractor helpers', () => {
  it('detects supported document types from extension', () => {
    expect(detectReferenceDocumentType('/tmp/a.pdf')).toBe('pdf')
    expect(detectReferenceDocumentType('/tmp/a.docx')).toBe('docx')
    expect(detectReferenceDocumentType('/tmp/a.doc')).toBe('doc')
    expect(detectReferenceDocumentType('/tmp/a.txt')).toBeNull()
  })

  it('normalizes whitespace', () => {
    expect(normalizeExtractedText('A\n\n B\t C')).toBe('A B C')
  })

  it('extracts a references section when a heading exists', () => {
    const text = 'Intro text\nReferences\n[1] Alpha. 2020.\n[2] Beta. 2021.'
    expect(extractReferenceSection(text)).toContain('Alpha')
  })

  it('falls back to tail text when no references heading exists', () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n')
    const candidate = extractReferenceCandidateText(text, 200)
    expect(candidate).toContain('line 199')
    expect(candidate.length).toBeLessThanOrEqual(200)
  })
})
