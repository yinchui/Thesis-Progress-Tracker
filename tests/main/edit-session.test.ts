import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  archiveSession,
  clearSession,
  createEditSession,
  getActiveSession,
  loadPersistedSession,
  shouldAutoArchiveAfterClose,
} from '../../src/main/edit-session'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-session-test-'))
  fs.mkdirSync(path.join(tmpDir, 'files', 'thesis_t1'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'), 'base content')
  fs.writeFileSync(path.join(tmpDir, 'data.json'), JSON.stringify({
    theses: [{ id: 't1', title: 'Test', createdAt: '', updatedAt: '' }],
    currentThesisId: 't1',
    versions: [{
      id: 'base',
      thesisId: 't1',
      version: 'v1.0',
      date: '2026-01-01',
      changes: 'init',
      focus: 'intro',
      filePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      fileName: 'thesis.docx',
      fileType: 'DOCX',
    }],
  }))
})

afterEach(() => {
  clearSession()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('createEditSession', () => {
  it('copies file and returns session with autoArchive=true for docx', () => {
    const session = createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.1', changes: 'updated intro', focus: 'chapter 1' },
    }, tmpDir)

    expect(session.autoArchive).toBe(true)
    expect(session.newVersionId).toBeTruthy()
    expect(fs.existsSync(session.editFilePath)).toBe(true)
    expect(getActiveSession()).toBe(session)
  })

  it('sets autoArchive=false for txt files', () => {
    const txtPath = path.join(tmpDir, 'files', 'thesis_t1', 'version_base.txt')
    fs.writeFileSync(txtPath, 'text content')

    const session = createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: txtPath,
      baseFileName: 'thesis.txt',
      baseFileType: 'TXT',
      versionInfo: { version: 'v1.1', changes: 'edit', focus: 'body' },
    }, tmpDir)

    expect(session.autoArchive).toBe(false)
  })

  it('persists session to edit-session.json', () => {
    createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.1', changes: 'c', focus: 'f' },
    }, tmpDir)

    const persisted = JSON.parse(fs.readFileSync(path.join(tmpDir, 'edit-session.json'), 'utf-8'))
    expect(persisted.newVersionId).toBeTruthy()
  })

  it('throws if a session is already active', () => {
    createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.1', changes: 'c', focus: 'f' },
    }, tmpDir)

    expect(() => createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.2', changes: 'c', focus: 'f' },
    }, tmpDir)).toThrow()
  })
})

describe('clearSession', () => {
  it('deletes copied file and edit-session.json', () => {
    const session = createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.1', changes: 'c', focus: 'f' },
    }, tmpDir)

    const editFilePath = session.editFilePath
    clearSession(tmpDir, true)

    expect(getActiveSession()).toBeNull()
    expect(fs.existsSync(editFilePath)).toBe(false)
    expect(fs.existsSync(path.join(tmpDir, 'edit-session.json'))).toBe(false)
  })
})

describe('archiveSession', () => {
  it('writes version to data.json and cleans up session', () => {
    const session = createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.1', changes: 'updated', focus: 'intro' },
    }, tmpDir)

    archiveSession(tmpDir)

    expect(getActiveSession()).toBeNull()
    expect(fs.existsSync(path.join(tmpDir, 'edit-session.json'))).toBe(false)

    const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'data.json'), 'utf-8'))
    expect(data.versions).toHaveLength(2)
    expect(data.versions[0].version).toBe('v1.1')
    expect(data.versions[0].id).toBe(session.newVersionId)
    expect(fs.existsSync(session.editFilePath)).toBe(true)
  })
})

describe('loadPersistedSession', () => {
  it('returns null when no edit-session.json exists', () => {
    expect(loadPersistedSession(tmpDir)).toBeNull()
  })

  it('loads session from edit-session.json', () => {
    createEditSession({
      baseVersionId: 'base',
      thesisId: 't1',
      baseFilePath: path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'),
      baseFileName: 'thesis.docx',
      baseFileType: 'DOCX',
      versionInfo: { version: 'v1.1', changes: 'c', focus: 'f' },
    }, tmpDir)

    clearSession()

    const loaded = loadPersistedSession(tmpDir)
    expect(loaded).not.toBeNull()
    expect(loaded!.versionInfo.version).toBe('v1.1')
  })
})

describe('shouldAutoArchiveAfterClose', () => {
  it('returns true when file changed and is no longer open', () => {
    expect(shouldAutoArchiveAfterClose(100, 200, false)).toBe(true)
  })

  it('returns false when file changed but is still open', () => {
    expect(shouldAutoArchiveAfterClose(100, 200, true)).toBe(false)
  })

  it('returns false when file did not change', () => {
    expect(shouldAutoArchiveAfterClose(100, 100, false)).toBe(false)
  })
})
