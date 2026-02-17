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
})
