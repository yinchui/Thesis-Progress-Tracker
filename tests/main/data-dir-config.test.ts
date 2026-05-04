import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { migrateDataFiles, resolveDataDirStatus } from '../../src/main/data-dir-config'

describe('resolveDataDirStatus', () => {
  it('prefers custom directory when writable', () => {
    const status = resolveDataDirStatus({
      customDir: 'D:/custom-data',
      appDefaultDir: 'C:/Program Files/App/data',
      fallbackUserDir: 'C:/Users/u/AppData/Roaming/App/data',
      canWrite: (target) => target === 'D:/custom-data',
    })

    expect(status.effectivePath).toBe('D:/custom-data')
    expect(status.source).toBe('custom')
    expect(status.fallbackMessage).toBeUndefined()
  })

  it('falls back to user dir when app dir is not writable', () => {
    const status = resolveDataDirStatus({
      customDir: undefined,
      appDefaultDir: 'C:/Program Files/App/data',
      fallbackUserDir: 'C:/Users/u/AppData/Roaming/App/data',
      canWrite: (target) => target !== 'C:/Program Files/App/data',
    })

    expect(status.effectivePath).toBe('C:/Users/u/AppData/Roaming/App/data')
    expect(status.source).toBe('fallback')
    expect(status.fallbackMessage).toContain('fallback')
  })
})

describe('migrateDataFiles', () => {
  let tempDir: string
  let oldPath: string
  let newPath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thesis-test-'))
    oldPath = path.join(tempDir, 'old')
    newPath = path.join(tempDir, 'new')
    fs.mkdirSync(oldPath, { recursive: true })
    fs.mkdirSync(newPath, { recursive: true })
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('migrates data.json when it exists', () => {
    const testData = { theses: [], versions: [] }
    fs.writeFileSync(path.join(oldPath, 'data.json'), JSON.stringify(testData))

    const result = migrateDataFiles(oldPath, newPath)

    expect(result).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'data.json'))).toBe(true)
    const migratedData = JSON.parse(fs.readFileSync(path.join(newPath, 'data.json'), 'utf-8'))
    expect(migratedData).toEqual(testData)
  })

  it('migrates files directory recursively', () => {
    const filesDir = path.join(oldPath, 'files', 'thesis_123')
    fs.mkdirSync(filesDir, { recursive: true })
    fs.writeFileSync(path.join(filesDir, 'version_1.pdf'), 'test content')

    const result = migrateDataFiles(oldPath, newPath)

    expect(result).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'files', 'thesis_123', 'version_1.pdf'))).toBe(true)
    const content = fs.readFileSync(path.join(newPath, 'files', 'thesis_123', 'version_1.pdf'), 'utf-8')
    expect(content).toBe('test content')
  })

  it('does not overwrite existing files in new path', () => {
    fs.writeFileSync(path.join(oldPath, 'data.json'), JSON.stringify({ old: true }))
    fs.writeFileSync(path.join(newPath, 'data.json'), JSON.stringify({ new: true }))

    const result = migrateDataFiles(oldPath, newPath)

    expect(result).toBe(true)
    const data = JSON.parse(fs.readFileSync(path.join(newPath, 'data.json'), 'utf-8'))
    expect(data).toEqual({ new: true })
  })

  it('returns true when old path does not exist', () => {
    const nonExistentPath = path.join(tempDir, 'nonexistent')

    expect(migrateDataFiles(nonExistentPath, newPath)).toBe(true)
  })

  it('returns true when old and new paths are the same', () => {
    expect(migrateDataFiles(oldPath, oldPath)).toBe(true)
  })

  it('migrates edit session files when they exist', () => {
    fs.writeFileSync(path.join(oldPath, 'edit-session.json'), '{}')
    fs.writeFileSync(path.join(oldPath, 'edit-session-lock'), '')

    const result = migrateDataFiles(oldPath, newPath)

    expect(result).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'edit-session.json'))).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'edit-session-lock'))).toBe(true)
  })
})
