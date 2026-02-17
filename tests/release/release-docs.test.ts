import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('release docs', () => {
  it('contains required local release command and data-dir behavior notes', () => {
    const doc = fs.readFileSync('docs/release/windows-github-release.md', 'utf8')
    expect(doc).toContain('npm run release:local')
    expect(doc).toContain('GitHub Release')
    expect(doc).toContain('unsigned')
    expect(doc).toContain('程序目录')
    expect(doc).toContain('自动回退')
    expect(doc).toContain('设置')
  })
})
