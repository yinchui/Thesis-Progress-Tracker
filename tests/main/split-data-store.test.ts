import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  loadThesesIndex,
  saveThesesIndex,
  loadThesisVersions,
  saveThesisVersions,
  loadThesisReferences,
  saveThesisReferences,
  loadLocalState,
  saveLocalState,
  getThesisDir,
  resolveVersionFilePath,
  toRelativeFilePath,
  sanitizeFileName,
} from '../../src/main/split-data-store'

describe('split-data-store', () => {
  let tmpDir: string
  let userDataDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sds-test-'))
    userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sds-ud-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    fs.rmSync(userDataDir, { recursive: true, force: true })
  })

  describe('theses-index', () => {
    it('returns empty theses array when file does not exist', () => {
      const result = loadThesesIndex(tmpDir)
      expect(result.theses).toEqual([])
    })

    it('round-trips theses index', () => {
      const index = {
        theses: [
          { id: '1', title: '论文A', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        ],
      }
      saveThesesIndex(tmpDir, index)
      const loaded = loadThesesIndex(tmpDir)
      expect(loaded.theses).toHaveLength(1)
      expect(loaded.theses[0].title).toBe('论文A')
    })
  })

  describe('thesis-versions', () => {
    it('returns empty versions array when file does not exist', () => {
      const result = loadThesisVersions(tmpDir, '论文A')
      expect(result.versions).toEqual([])
    })

    it('round-trips thesis versions', () => {
      const data = {
        versions: [
          { id: 'v1', thesisId: '1', version: '2026-01-01-1', date: '2026-01-01', fileName: 'test.pdf', fileType: 'PDF' },
        ],
      }
      saveThesisVersions(tmpDir, '论文A', data)
      const loaded = loadThesisVersions(tmpDir, '论文A')
      expect(loaded.versions).toHaveLength(1)
      expect(loaded.versions[0].version).toBe('2026-01-01-1')
    })

    it('creates thesis directory if it does not exist', () => {
      saveThesisVersions(tmpDir, '新论文', { versions: [] })
      const dir = path.join(tmpDir, sanitizeFileName('新论文'))
      expect(fs.existsSync(dir)).toBe(true)
    })
  })

  describe('thesis-references', () => {
    it('returns empty references array when file does not exist', () => {
      const result = loadThesisReferences(tmpDir, '论文A')
      expect(result.references).toEqual([])
    })

    it('round-trips thesis references', () => {
      const data = {
        references: [
          {
            id: 'r1',
            thesisId: '1',
            title: '参考文献A',
            authors: '作者A',
            year: '2026',
            createdAt: '2026-06-16T00:00:00.000Z',
          },
        ],
      }
      saveThesisReferences(tmpDir, '论文A', data)
      const loaded = loadThesisReferences(tmpDir, '论文A')
      expect(loaded.references).toHaveLength(1)
      expect(loaded.references[0].title).toBe('参考文献A')
      expect(loaded.references[0].authors).toBe('作者A')
      expect(loaded.references[0].year).toBe('2026')
    })

    it('creates thesis directory if it does not exist', () => {
      saveThesisReferences(tmpDir, '新论文', { references: [] })
      const dir = path.join(tmpDir, sanitizeFileName('新论文'))
      expect(fs.existsSync(dir)).toBe(true)
      expect(fs.existsSync(path.join(dir, 'references.json'))).toBe(true)
    })

    it('returns empty references array when references json is invalid', () => {
      const thesisDir = path.join(tmpDir, sanitizeFileName('坏论文'))
      fs.mkdirSync(thesisDir, { recursive: true })
      fs.writeFileSync(path.join(thesisDir, 'references.json'), '{bad json', 'utf8')
      const result = loadThesisReferences(tmpDir, '坏论文')
      expect(result.references).toEqual([])
    })
  })

  describe('local-state', () => {
    it('returns null currentThesisId when file does not exist', () => {
      const result = loadLocalState(userDataDir)
      expect(result.currentThesisId).toBeNull()
    })

    it('round-trips local state', () => {
      saveLocalState(userDataDir, { currentThesisId: 'abc' })
      const loaded = loadLocalState(userDataDir)
      expect(loaded.currentThesisId).toBe('abc')
    })
  })

  describe('path helpers', () => {
    it('getThesisDir returns sanitized path', () => {
      const dir = getThesisDir(tmpDir, '我的论文')
      expect(dir).toBe(path.join(tmpDir, '我的论文'))
    })

    it('resolveVersionFilePath joins correctly', () => {
      const full = resolveVersionFilePath(tmpDir, '论文A', 'test.pdf')
      expect(full).toBe(path.join(tmpDir, sanitizeFileName('论文A'), 'test.pdf'))
    })

    it('toRelativeFilePath extracts filename', () => {
      const thesisDir = path.join(tmpDir, '论文A')
      const abs = path.join(thesisDir, 'test.pdf')
      expect(toRelativeFilePath(abs, thesisDir)).toBe('test.pdf')
    })

    it('sanitizeFileName replaces illegal chars', () => {
      expect(sanitizeFileName('a/b\\c:d')).toBe('a_b_c_d')
    })
  })
})
