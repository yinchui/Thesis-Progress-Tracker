import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('preload api contract', () => {
  it('includes resetDataDir and openDataDir methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('resetDataDir')
    expect(source).toContain('openDataDir')
  })
})
