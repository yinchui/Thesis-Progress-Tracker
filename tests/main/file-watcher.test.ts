import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createFileWatcher, FileWatcher } from '../../src/main/file-watcher'

describe('file-watcher', () => {
  let tmpDir: string
  let watcher: FileWatcher | null

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fw-test-'))
    watcher = null
  })

  afterEach(async () => {
    watcher?.stop()
    await new Promise(r => setTimeout(r, 200))
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('detects theses-index.json changes', async () => {
    const onThesesChanged = vi.fn()
    watcher = createFileWatcher(tmpDir, {
      onThesesIndexChanged: onThesesChanged,
      onVersionsChanged: vi.fn(),
      onConflictDetected: vi.fn(),
    })
    watcher.start()
    await new Promise(r => setTimeout(r, 300))

    fs.writeFileSync(path.join(tmpDir, 'theses-index.json'), '{"theses":[]}')

    await new Promise(r => setTimeout(r, 1000))
    expect(onThesesChanged).toHaveBeenCalled()
  })

  it('detects versions.json changes in thesis subdirectory', async () => {
    const onVersionsChanged = vi.fn()
    const thesisDir = path.join(tmpDir, 'test-thesis')
    fs.mkdirSync(thesisDir)

    watcher = createFileWatcher(tmpDir, {
      onThesesIndexChanged: vi.fn(),
      onVersionsChanged: onVersionsChanged,
      onConflictDetected: vi.fn(),
    })
    watcher.start()
    await new Promise(r => setTimeout(r, 300))

    fs.writeFileSync(path.join(thesisDir, 'versions.json'), '{"versions":[]}')

    await new Promise(r => setTimeout(r, 1000))
    expect(onVersionsChanged).toHaveBeenCalledWith('test-thesis')
  })

  it('suppresses self-triggered changes during silent period', async () => {
    const onThesesChanged = vi.fn()
    watcher = createFileWatcher(tmpDir, {
      onThesesIndexChanged: onThesesChanged,
      onVersionsChanged: vi.fn(),
      onConflictDetected: vi.fn(),
    })
    watcher.start()
    await new Promise(r => setTimeout(r, 300))
    watcher.setSilent(2000)

    fs.writeFileSync(path.join(tmpDir, 'theses-index.json'), '{"theses":[]}')

    await new Promise(r => setTimeout(r, 1000))
    expect(onThesesChanged).not.toHaveBeenCalled()
  })

  it('detects conflict files', async () => {
    const onConflict = vi.fn()
    watcher = createFileWatcher(tmpDir, {
      onThesesIndexChanged: vi.fn(),
      onVersionsChanged: vi.fn(),
      onConflictDetected: onConflict,
    })
    watcher.start()
    await new Promise(r => setTimeout(r, 300))

    fs.writeFileSync(
      path.join(tmpDir, 'theses-index (冲突副本 2026-04-09).json'),
      '{}'
    )

    await new Promise(r => setTimeout(r, 1000))
    expect(onConflict).toHaveBeenCalled()
  })
})
