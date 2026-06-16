import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('reference IPC contract', () => {
  const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')

  it('registers reference handlers', () => {
    expect(source).toContain("'get-references'")
    expect(source).toContain("'add-reference'")
    expect(source).toContain("'delete-reference'")
  })

  it('uses split-data-store reference helpers', () => {
    expect(source).toContain('loadThesisReferences')
    expect(source).toContain('saveThesisReferences')
  })
})
