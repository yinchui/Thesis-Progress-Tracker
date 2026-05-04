import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('edit-session IPC contract', () => {
  const ipcSource = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')

  it('registers start-edit-session handler', () => {
    expect(ipcSource).toContain("'start-edit-session'")
  })

  it('registers cancel-edit-session handler', () => {
    expect(ipcSource).toContain("'cancel-edit-session'")
  })

  it('registers finish-edit-session handler', () => {
    expect(ipcSource).toContain("'finish-edit-session'")
  })
})
