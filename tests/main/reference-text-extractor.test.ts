import { describe, expect, it } from 'vitest'
import {
  detectReferenceDocumentType,
  extractUploadedDocumentIdentityText,
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

  it('extracts uploaded document identity text without trailing reference list', () => {
    const text = [
      'A Study of Thesis Writing',
      'Jane Doe, John Smith',
      'Journal of Writing Research, 2024',
      'Abstract',
      'This paper studies thesis writing progress.',
      'References',
      'Chen, A. A cited paper. 2019.',
      'Wang, B. Another cited paper. 2020.',
    ].join('\n')

    const candidate = extractUploadedDocumentIdentityText(text)

    expect(candidate).toContain('A Study of Thesis Writing')
    expect(candidate).toContain('Jane Doe')
    expect(candidate).toContain('Journal of Writing Research')
    expect(candidate).not.toContain('Chen, A. A cited paper')
    expect(candidate).not.toContain('Wang, B. Another cited paper')
  })

  it('extracts uploaded document identity text when extraction has normalized line breaks', () => {
    const text = [
      'A Study of Thesis Writing',
      'Jane Doe, John Smith',
      'Journal of Writing Research, 2024',
      'Abstract',
      'This paper studies thesis writing progress.',
      'References',
      'Chen, A. A cited paper. 2019.',
      'Wang, B. Another cited paper. 2020.',
    ].join(' ')

    const candidate = extractUploadedDocumentIdentityText(text)

    expect(candidate).toContain('A Study of Thesis Writing')
    expect(candidate).toContain('Jane Doe')
    expect(candidate).not.toContain('Chen, A. A cited paper')
    expect(candidate).not.toContain('Wang, B. Another cited paper')
  })

  it('extracts uploaded document identity text before a Chinese reference list', () => {
    const text = [
      '论文进度管理系统研究',
      '张三，李四',
      '软件工程学报，2025',
      '摘要',
      '本文研究论文进度管理。',
      '参考文献',
      '王五. 被引用论文. 2020.',
      '赵六. 另一个被引用论文. 2021.',
    ].join(' ')

    const candidate = extractUploadedDocumentIdentityText(text)

    expect(candidate).toContain('论文进度管理系统研究')
    expect(candidate).toContain('张三')
    expect(candidate).not.toContain('王五. 被引用论文')
    expect(candidate).not.toContain('赵六. 另一个被引用论文')
  })

  it('does not treat ordinary references wording as the bibliography heading', () => {
    const text = [
      'A Study of Thesis Writing',
      'Jane Doe, John Smith',
      'Abstract',
      'This paper references prior work while studying thesis progress.',
      'References',
      'Chen, A. A cited paper. 2019.',
    ].join(' ')

    const candidate = extractUploadedDocumentIdentityText(text)

    expect(candidate).toContain('This paper references prior work')
    expect(candidate).not.toContain('Chen, A. A cited paper')
  })
})
