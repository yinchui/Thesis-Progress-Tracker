import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('reference IPC contract', () => {
  const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')

  it('registers reference handlers', () => {
    expect(source).toContain("'get-references'")
    expect(source).toContain("'get-reference-data'")
    expect(source).toContain("'add-reference'")
    expect(source).toContain("'delete-reference'")
  })

  it('registers reference file handlers', () => {
    expect(source).toContain("'select-reference-file'")
    expect(source).toContain("'import-reference-file'")
    expect(source).toContain("'delete-reference-file'")
    expect(source).toContain("'save-recognized-references'")
  })

  it('uses split-data-store reference helpers', () => {
    expect(source).toContain('loadThesisReferences')
    expect(source).toContain('saveThesisReferences')
  })

  it('stores uploaded reference files under a references subdirectory', () => {
    expect(source).toContain("path.join(thesisDir, 'references')")
    expect(source).toContain('referenceFiles')
  })

  it('uses extraction, DeepSeek settings, and recognition in import flow', () => {
    expect(source).toContain('extractTextFromReferenceDocument')
    expect(source).toContain('extractReferenceCandidateText')
    expect(source).toContain('loadDeepSeekApiKey')
    expect(source).toContain('recognizeReferencesWithDeepSeek')
  })
})
