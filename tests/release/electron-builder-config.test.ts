import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('electron-builder config', () => {
  it('targets nsis installer for windows x64', () => {
    const config = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'))
    const winTarget = JSON.stringify(config.win.target)
    expect(winTarget).toContain('nsis')
    expect(winTarget).not.toContain('portable')
    expect(winTarget).toContain('x64')
  })

  it('ad-hoc signs and verifies macOS apps before packaging DMGs', () => {
    const workflow = fs.readFileSync('.github/workflows/release.yml', 'utf8')

    expect(workflow).toContain('codesign --force --deep --sign -')
    expect(workflow).toContain('codesign --verify --deep --strict --verbose=2')
    expect(workflow).toContain('--prepackaged')
  })
})
