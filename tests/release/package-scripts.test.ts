import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('package scripts', () => {
  it('includes dist:win and release:local scripts', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    expect(pkg.scripts['dist:win']).toBeDefined()
    expect(pkg.scripts['release:local']).toBeDefined()
  })

  it('uses signAndEditExecutable=false to avoid local winCodeSign permission failures', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    expect(pkg.scripts['dist:win']).toContain('--config.win.signAndEditExecutable=false')
  })
})
