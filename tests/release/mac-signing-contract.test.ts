import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('mac release signing contract', () => {
  it('uses an afterPack hook to ad-hoc sign mac app bundles when no Developer ID is available', () => {
    const config = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'))
    expect(config.afterPack).toBe('scripts/after-pack-sign-mac.cjs')
  })

  it('does not force GitHub mac releases to skip code signing entirely', () => {
    const workflow = fs.readFileSync('.github/workflows/release.yml', 'utf8')
    expect(workflow).not.toContain('CSC_IDENTITY_AUTO_DISCOVERY: false')
  })
})
