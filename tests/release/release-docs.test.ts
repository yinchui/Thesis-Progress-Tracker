import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('release docs', () => {
  it('contains required local release command and GitHub release steps', () => {
    const doc = fs.readFileSync('docs/release/windows-github-release.md', 'utf8')
    expect(doc).toContain('npm run release:local')
    expect(doc).toContain('GitHub Release')
    expect(doc).toContain('unsigned')
  })
})
