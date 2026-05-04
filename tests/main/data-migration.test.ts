import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { needsMigration, migrateToSplitFormat } from '../../src/main/data-migration'
import { loadThesesIndex, loadThesisVersions, loadLocalState, sanitizeFileName } from '../../src/main/split-data-store'

describe('data-migration', () => {
  let tmpDir: string
  let userDataDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-test-'))
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-ud-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    fs.rmSync(userDataDir, { recursive: true, force: true })
  })

  it('needsMigration returns false when no data.json', () => {
    expect(needsMigration(tmpDir)).toBe(false)
  })

  it('needsMigration returns true when data.json exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{}')
    expect(needsMigration(tmpDir)).toBe(true)
  })

  it('migrates theses and versions to split format', () => {
    const thesisTitle = '测试论文'
    const oldData = {
      theses: [
        { id: 't1', title: thesisTitle, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
      currentThesisId: 't1',
      versions: [
        {
          id: 'v1', thesisId: 't1', version: '1.0', date: '2026-01-01',
          changes: '初稿', focus: '引言',
          filePath: path.join(tmpDir, 'files', sanitizeFileName(thesisTitle), 'test.pdf'),
          fileName: 'test.pdf', fileType: 'PDF',
        },
      ],
    }

    // Create old structure
    const oldFilesDir = path.join(tmpDir, 'files', sanitizeFileName(thesisTitle))
    fs.mkdirSync(oldFilesDir, { recursive: true })
    fs.writeFileSync(path.join(oldFilesDir, 'test.pdf'), 'fake-pdf')
    fs.writeFileSync(path.join(tmpDir, 'data.json'), JSON.stringify(oldData))

    const result = migrateToSplitFormat(tmpDir, userDataDir)
    expect(result).toBe(true)

    // Verify new structure
    const index = loadThesesIndex(tmpDir)
    expect(index.theses).toHaveLength(1)
    expect(index.theses[0].title).toBe(thesisTitle)

    const versions = loadThesisVersions(tmpDir, thesisTitle)
    expect(versions.versions).toHaveLength(1)
    expect(versions.versions[0].filePath).toBe('test.pdf')

    // Verify file moved
    const newFileDir = path.join(tmpDir, sanitizeFileName(thesisTitle))
    expect(fs.existsSync(path.join(newFileDir, 'test.pdf'))).toBe(true)

    // Verify local state
    const localState = loadLocalState(userDataDir)
    expect(localState.currentThesisId).toBe('t1')

    // Verify backup
    expect(fs.existsSync(path.join(tmpDir, 'data.json.backup'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'data.json'))).toBe(false)
  })

  it('skips migration when data.json does not exist', () => {
    const result = migrateToSplitFormat(tmpDir, userDataDir)
    expect(result).toBe(true)
  })
})
