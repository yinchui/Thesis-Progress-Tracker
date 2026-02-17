import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('ipc data path source', () => {
  it('does not include hard-coded E drive data path', () => {
    const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')
    expect(source.includes("path.join('E:'")).toBe(false)
  })

  it('exposes data-dir status, reset and open handlers', () => {
    const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')
    expect(source).toContain("ipcMain.handle('get-data-dir'")
    expect(source).toContain('effectivePath')
    expect(source).toContain("ipcMain.handle('reset-data-dir'")
    expect(source).toContain("ipcMain.handle('open-data-dir'")
  })
})
