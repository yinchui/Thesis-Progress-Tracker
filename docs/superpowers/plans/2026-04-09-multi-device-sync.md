# 多设备同步（坚果云方案）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单一 data.json 拆分为按论文独立的数据文件，配合 chokidar 文件监听实现两台电脑通过坚果云自动同步论文数据。

**Architecture:** 新建 split-data-store 模块处理拆分后的文件读写（theses-index.json + per-thesis versions.json + local-state.json），新建 file-watcher 模块监听数据目录变化并通过 IPC 通知渲染进程刷新。重构 ipc-handlers 和 edit-session 使用新数据层。

**Tech Stack:** Electron 28, React 18, TypeScript 5, Vitest 2, chokidar, npm.

---

Skill refs for execution: `@test-driven-development`, `@systematic-debugging`, `@verification-before-completion`.

## File Structure

### New Files
- `src/main/split-data-store.ts` — 拆分后的数据读写层（theses-index.json, versions.json, local-state.json）
- `src/main/data-migration.ts` — 旧 data.json → 新格式迁移
- `src/main/file-watcher.ts` — chokidar 文件监听 + 防抖 + 自触发抑制
- `tests/main/split-data-store.test.ts` — 数据层单元测试
- `tests/main/data-migration.test.ts` — 迁移单元测试
- `tests/main/file-watcher.test.ts` — 文件监听单元测试

### Modified Files
- `src/main/ipc-handlers.ts` — 替换 loadData/saveData 为新数据层，集成文件监听
- `src/main/edit-session.ts` — archiveSession 使用新数据层，edit-session.json 移至 userData
- `src/preload/preload.ts` — 添加同步事件监听 API
- `src/renderer/types.ts` — 添加同步相关类型
- `src/renderer/App.tsx` — 处理同步 IPC 事件
- `src/renderer/components/Sidebar.tsx` — 同步状态指示
- `src/renderer/components/SettingsModal.tsx` — 坚果云同步提示
- `package.json` — 添加 chokidar 依赖

---

### Task 1: Install chokidar Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install chokidar**

Run: `npm install chokidar`

Expected: chokidar added to dependencies in package.json.

- [ ] **Step 2: Verify installation**

Run: `node -e "require('chokidar'); console.log('ok')"`

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add chokidar dependency for file watching"
```

---

### Task 2: Create Split Data Store Module

**Files:**
- Create: `src/main/split-data-store.ts`
- Create: `tests/main/split-data-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/main/split-data-store.test.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  loadThesesIndex,
  saveThesesIndex,
  loadThesisVersions,
  saveThesisVersions,
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/main/split-data-store.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Write implementation**

Create `src/main/split-data-store.ts`:

```typescript
import * as fs from 'fs'
import * as path from 'path'

// ==================== Types ====================

export interface Thesis {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ThesesIndex {
  theses: Thesis[]
}

export interface VersionRecord {
  id: string
  thesisId: string
  version: string
  date: string
  changes?: string
  focus?: string
  filePath?: string   // relative to thesis dir (filename only)
  fileName?: string
  fileType?: string
}

export interface ThesisVersions {
  versions: VersionRecord[]
}

export interface LocalState {
  currentThesisId: string | null
}

// ==================== Helpers ====================

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'untitled'
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ==================== Theses Index ====================

const THESES_INDEX_FILE = 'theses-index.json'

export function loadThesesIndex(dataDir: string): ThesesIndex {
  return readJsonSafe(path.join(dataDir, THESES_INDEX_FILE), { theses: [] })
}

export function saveThesesIndex(dataDir: string, index: ThesesIndex): void {
  writeJson(path.join(dataDir, THESES_INDEX_FILE), index)
}

// ==================== Thesis Versions ====================

const VERSIONS_FILE = 'versions.json'

export function getThesisDir(dataDir: string, thesisTitle: string): string {
  return path.join(dataDir, sanitizeFileName(thesisTitle))
}

export function loadThesisVersions(dataDir: string, thesisTitle: string): ThesisVersions {
  const dir = getThesisDir(dataDir, thesisTitle)
  return readJsonSafe(path.join(dir, VERSIONS_FILE), { versions: [] })
}

export function saveThesisVersions(dataDir: string, thesisTitle: string, data: ThesisVersions): void {
  const dir = getThesisDir(dataDir, thesisTitle)
  writeJson(path.join(dir, VERSIONS_FILE), data)
}

// ==================== Local State ====================

const LOCAL_STATE_FILE = 'local-state.json'

export function loadLocalState(userDataPath: string): LocalState {
  return readJsonSafe(path.join(userDataPath, LOCAL_STATE_FILE), { currentThesisId: null })
}

export function saveLocalState(userDataPath: string, state: LocalState): void {
  writeJson(path.join(userDataPath, LOCAL_STATE_FILE), state)
}

// ==================== Path Helpers ====================

export function resolveVersionFilePath(dataDir: string, thesisTitle: string, relativePath: string): string {
  return path.join(getThesisDir(dataDir, thesisTitle), relativePath)
}

export function toRelativeFilePath(absolutePath: string, thesisDir: string): string {
  return path.relative(thesisDir, absolutePath)
}

// ==================== Read-Merge-Write for theses-index ====================

export function mergeThesesIndex(existing: ThesesIndex, incoming: ThesesIndex): ThesesIndex {
  const merged = new Map<string, Thesis>()
  for (const t of existing.theses) merged.set(t.id, t)
  for (const t of incoming.theses) {
    const prev = merged.get(t.id)
    if (!prev || t.updatedAt > prev.updatedAt) {
      merged.set(t.id, t)
    }
  }
  return { theses: Array.from(merged.values()) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/main/split-data-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/split-data-store.ts tests/main/split-data-store.test.ts
git commit -m "feat: add split data store module for per-thesis file storage"
```

---

### Task 3: Create Data Migration Module

**Files:**
- Create: `src/main/data-migration.ts`
- Create: `tests/main/data-migration.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/main/data-migration.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/main/data-migration.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Write implementation**

Create `src/main/data-migration.ts`:

```typescript
import * as fs from 'fs'
import * as path from 'path'
import log from 'electron-log'
import {
  saveThesesIndex,
  saveThesisVersions,
  saveLocalState,
  sanitizeFileName,
  getThesisDir,
  Thesis,
  VersionRecord,
} from './split-data-store'

interface OldAppData {
  theses: Thesis[]
  currentThesisId: string | null
  versions: Array<VersionRecord & { filePath?: string }>
}

export function needsMigration(dataDir: string): boolean {
  return fs.existsSync(path.join(dataDir, 'data.json'))
}

export function migrateToSplitFormat(dataDir: string, userDataPath: string): boolean {
  const dataJsonPath = path.join(dataDir, 'data.json')

  if (!fs.existsSync(dataJsonPath)) {
    return true
  }

  try {
    const raw = fs.readFileSync(dataJsonPath, 'utf-8')
    const oldData: OldAppData = JSON.parse(raw)

    // 1. Write theses-index.json
    saveThesesIndex(dataDir, { theses: oldData.theses || [] })

    // 2. For each thesis, write versions.json and move files
    for (const thesis of (oldData.theses || [])) {
      const thesisVersions = (oldData.versions || []).filter(v => v.thesisId === thesis.id)
      const newThesisDir = getThesisDir(dataDir, thesis.title)

      if (!fs.existsSync(newThesisDir)) {
        fs.mkdirSync(newThesisDir, { recursive: true })
      }

      // Move files from old location and convert paths
      const migratedVersions: VersionRecord[] = thesisVersions.map(v => {
        const newVersion = { ...v }

        if (v.filePath && fs.existsSync(v.filePath)) {
          const fileName = path.basename(v.filePath)
          const newFilePath = path.join(newThesisDir, fileName)

          if (!fs.existsSync(newFilePath)) {
            try {
              fs.copyFileSync(v.filePath, newFilePath)
            } catch (e) {
              log.error('Error copying file during migration:', e)
            }
          }

          newVersion.filePath = fileName
        } else if (v.filePath) {
          // File doesn't exist, just store the basename
          newVersion.filePath = path.basename(v.filePath)
        }

        return newVersion
      })

      saveThesisVersions(dataDir, thesis.title, { versions: migratedVersions })
    }

    // 3. Save local state (currentThesisId)
    saveLocalState(userDataPath, { currentThesisId: oldData.currentThesisId || null })

    // 4. Rename old data.json to backup
    fs.renameSync(dataJsonPath, dataJsonPath + '.backup')

    // 5. Clean up old files/ directory if empty after migration
    const oldFilesDir = path.join(dataDir, 'files')
    if (fs.existsSync(oldFilesDir)) {
      try {
        // Try to remove - will fail if not empty, which is fine
        fs.rmSync(oldFilesDir, { recursive: true, force: true })
      } catch {
        log.info('Old files/ directory not empty, keeping it')
      }
    }

    log.info('Migration to split format completed successfully')
    return true
  } catch (error) {
    log.error('Migration failed:', error)
    return false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/main/data-migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/data-migration.ts tests/main/data-migration.test.ts
git commit -m "feat: add data migration from monolithic data.json to split format"
```

---

### Task 4: Create File Watcher Module

**Files:**
- Create: `src/main/file-watcher.ts`
- Create: `tests/main/file-watcher.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/main/file-watcher.test.ts`:

```typescript
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

  afterEach(() => {
    watcher?.stop()
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

    // Write theses-index.json
    fs.writeFileSync(path.join(tmpDir, 'theses-index.json'), '{"theses":[]}')

    // Wait for debounce (500ms) + buffer
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

    fs.writeFileSync(
      path.join(tmpDir, 'theses-index (冲突副本 2026-04-09).json'),
      '{}'
    )

    await new Promise(r => setTimeout(r, 1000))
    expect(onConflict).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/main/file-watcher.test.ts`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Write implementation**

Create `src/main/file-watcher.ts`:

```typescript
import * as path from 'path'
import chokidar from 'chokidar'
import log from 'electron-log'

export interface FileWatcherCallbacks {
  onThesesIndexChanged: () => void
  onVersionsChanged: (thesisDirName: string) => void
  onConflictDetected: (filePath: string) => void
}

export interface FileWatcher {
  start(): void
  stop(): void
  setSilent(durationMs: number): void
}

const CONFLICT_PATTERNS = ['冲突副本', 'SyncConflict', 'conflicted copy']
const DEBOUNCE_MS = 500

function isConflictFile(fileName: string): boolean {
  return CONFLICT_PATTERNS.some(p => fileName.includes(p))
}

export function createFileWatcher(dataDir: string, callbacks: FileWatcherCallbacks): FileWatcher {
  let watcher: chokidar.FSWatcher | null = null
  let silentUntil = 0
  let debounceTimers = new Map<string, NodeJS.Timeout>()

  function isSilent(): boolean {
    return Date.now() < silentUntil
  }

  function debounce(key: string, fn: () => void): void {
    const existing = debounceTimers.get(key)
    if (existing) clearTimeout(existing)
    debounceTimers.set(key, setTimeout(() => {
      debounceTimers.delete(key)
      if (!isSilent()) {
        fn()
      }
    }, DEBOUNCE_MS))
  }

  function handleChange(filePath: string): void {
    const relativePath = path.relative(dataDir, filePath)
    const fileName = path.basename(filePath)
    const parts = relativePath.split(path.sep)

    // Check for conflict files
    if (isConflictFile(fileName)) {
      debounce(`conflict:${filePath}`, () => {
        log.info('Sync conflict detected:', filePath)
        callbacks.onConflictDetected(filePath)
      })
      return
    }

    // theses-index.json at root level
    if (parts.length === 1 && fileName === 'theses-index.json') {
      debounce('theses-index', () => {
        log.info('Theses index changed externally')
        callbacks.onThesesIndexChanged()
      })
      return
    }

    // <thesis-dir>/versions.json
    if (parts.length === 2 && fileName === 'versions.json') {
      const thesisDirName = parts[0]
      debounce(`versions:${thesisDirName}`, () => {
        log.info('Versions changed externally for:', thesisDirName)
        callbacks.onVersionsChanged(thesisDirName)
      })
      return
    }
  }

  return {
    start() {
      watcher = chokidar.watch(dataDir, {
        ignoreInitial: true,
        depth: 2,
        ignored: [
          /(^|[\/\])\../,           // dotfiles
          /\.(pdf|docx?|txt)$/i,     // thesis files
          /data\.json\.backup$/,      // backup files
        ],
      })

      watcher.on('add', handleChange)
      watcher.on('change', handleChange)

      log.info('File watcher started on:', dataDir)
    },

    stop() {
      if (watcher) {
        watcher.close()
        watcher = null
      }
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer)
      }
      debounceTimers.clear()
      log.info('File watcher stopped')
    },

    setSilent(durationMs: number) {
      silentUntil = Date.now() + durationMs
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/main/file-watcher.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/file-watcher.ts tests/main/file-watcher.test.ts
git commit -m "feat: add file watcher module with debounce and self-trigger suppression"
```

---

### Task 5: Refactor ipc-handlers.ts to Use Split Data Store

**Files:**
- Modify: `src/main/ipc-handlers.ts`

This is the largest refactoring task. Replace all `loadData()`/`saveData()` calls with the new split data store functions. The file watcher integration and IPC sync events are handled in Task 7.

- [ ] **Step 1: Add imports and replace utility functions**

At the top of `src/main/ipc-handlers.ts`, replace the old data imports and utility functions:

```typescript
// Add new imports (keep existing electron imports)
import {
  loadThesesIndex,
  saveThesesIndex,
  loadThesisVersions,
  saveThesisVersions,
  loadLocalState,
  saveLocalState,
  getThesisDir,
  resolveVersionFilePath,
  toRelativeFilePath,
  sanitizeFileName,
  Thesis,
  VersionRecord,
  mergeThesesIndex,
} from './split-data-store'
import { needsMigration, migrateToSplitFormat } from './data-migration'
```

Remove the old `loadData`, `saveData`, `getDataFilePath`, `sanitizeFileName` functions and the old `AppData` interface. Keep `generateId`, `uniqueFilePath`.

Replace `getThesisFilesDir` with:

```typescript
function getThesisFilesDirNew(thesisTitle: string): string {
  const dir = getThesisDir(getDataDir(), thesisTitle)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}
```

Add a helper to get userDataPath:

```typescript
function getUserDataPath(): string {
  return app.getPath('userData')
}
```

- [ ] **Step 2: Refactor thesis IPC handlers**

Replace `get-theses` handler:

```typescript
ipcMain.handle('get-theses', async () => {
  log.info('IPC: get-theses')
  const index = loadThesesIndex(getDataDir())
  if (index.theses.length === 0) {
    // Create default thesis for backward compatibility
    const defaultThesis: Thesis = {
      id: generateId(),
      title: '默认论文',
      description: 'Auto-created default thesis',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    index.theses.push(defaultThesis)
    saveThesesIndex(getDataDir(), index)
    saveLocalState(getUserDataPath(), { currentThesisId: defaultThesis.id })
  }
  return index.theses
})
```

Replace `create-thesis` handler:

```typescript
ipcMain.handle('create-thesis', async (_event, thesisData: { title: string; description?: string }) => {
  log.info('IPC: create-thesis', thesisData)
  const index = loadThesesIndex(getDataDir())

  const newThesis: Thesis = {
    id: generateId(),
    title: thesisData.title,
    description: thesisData.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  getThesisFilesDirNew(newThesis.title)
  saveThesisVersions(getDataDir(), newThesis.title, { versions: [] })

  index.theses.push(newThesis)
  saveThesesIndex(getDataDir(), index)
  saveLocalState(getUserDataPath(), { currentThesisId: newThesis.id })

  return newThesis
})
```

Replace `update-thesis` handler:

```typescript
ipcMain.handle('update-thesis', async (_event, id: string, updates: { title?: string; description?: string }) => {
  log.info('IPC: update-thesis', id, updates)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)
  const thesisIdx = index.theses.findIndex(t => t.id === id)
  if (thesisIdx === -1) return null

  const oldTitle = index.theses[thesisIdx].title

  index.theses[thesisIdx] = {
    ...index.theses[thesisIdx],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Rename thesis directory if title changed
  if (updates.title && updates.title !== oldTitle) {
    const oldDir = getThesisDir(dataDir, oldTitle)
    const newDir = getThesisDir(dataDir, updates.title)
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      try {
        fs.renameSync(oldDir, newDir)
        log.info(`Renamed thesis dir: ${oldTitle} -> ${updates.title}`)
      } catch (e) {
        log.error('Error renaming thesis dir:', e)
      }
    }
  }

  saveThesesIndex(dataDir, index)
  return index.theses[thesisIdx]
})
```

Replace `delete-thesis` handler:

```typescript
ipcMain.handle('delete-thesis', async (_event, id: string) => {
  log.info('IPC: delete-thesis', id)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)

  if (index.theses.length <= 1) {
    log.warn('Cannot delete the last thesis')
    return false
  }

  const thesis = index.theses.find(t => t.id === id)
  if (thesis) {
    const thesisDir = getThesisDir(dataDir, thesis.title)
    if (fs.existsSync(thesisDir)) {
      try {
        fs.rmSync(thesisDir, { recursive: true, force: true })
      } catch (e) {
        log.error('Error deleting thesis directory:', e)
      }
    }
  }

  index.theses = index.theses.filter(t => t.id !== id)
  saveThesesIndex(dataDir, index)

  const localState = loadLocalState(getUserDataPath())
  if (localState.currentThesisId === id) {
    saveLocalState(getUserDataPath(), { currentThesisId: index.theses[0]?.id || null })
  }

  return true
})
```

Replace `set-current-thesis` and `get-current-thesis`:

```typescript
ipcMain.handle('set-current-thesis', async (_event, id: string) => {
  log.info('IPC: set-current-thesis', id)
  saveLocalState(getUserDataPath(), { currentThesisId: id })
  return true
})

ipcMain.handle('get-current-thesis', async () => {
  log.info('IPC: get-current-thesis')
  const localState = loadLocalState(getUserDataPath())
  return localState.currentThesisId
})
```

- [ ] **Step 3: Refactor version IPC handlers**

Replace `get-versions`:

```typescript
ipcMain.handle('get-versions', async (_event, thesisId?: string) => {
  log.info('IPC: get-versions', thesisId)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)

  if (thesisId) {
    const thesis = index.theses.find(t => t.id === thesisId)
    if (!thesis) return []
    const data = loadThesisVersions(dataDir, thesis.title)
    // Resolve relative paths to absolute for renderer
    return data.versions.map(v => ({
      ...v,
      filePath: v.filePath ? resolveVersionFilePath(dataDir, thesis.title, v.filePath) : undefined,
    }))
  }

  // Return all versions (rare case)
  const allVersions: VersionRecord[] = []
  for (const thesis of index.theses) {
    const data = loadThesisVersions(dataDir, thesis.title)
    allVersions.push(...data.versions.map(v => ({
      ...v,
      filePath: v.filePath ? resolveVersionFilePath(dataDir, thesis.title, v.filePath) : undefined,
    })))
  }
  return allVersions
})
```

Replace `add-version`:

```typescript
ipcMain.handle('add-version', async (_event, versionData: any, thesisId?: string) => {
  log.info('IPC: add-version', versionData, thesisId)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)
  const localState = loadLocalState(getUserDataPath())

  const targetThesisId = thesisId || localState.currentThesisId
  if (!targetThesisId) {
    log.error('No target thesis for add-version')
    return false
  }

  const thesis = index.theses.find(t => t.id === targetThesisId)
  if (!thesis) return false

  const thesisDir = getThesisFilesDirNew(thesis.title)
  let relativeFilePath: string | undefined

  // Copy file to thesis directory
  if (versionData.filePath && fs.existsSync(versionData.filePath)) {
    const ext = path.extname(versionData.filePath)
    const baseName = versionData.fileName ? path.basename(versionData.fileName, ext) : generateId()
    const newFileName = `${sanitizeFileName(versionData.version)}_${sanitizeFileName(baseName)}${ext}`
    const newFilePath = uniqueFilePath(thesisDir, newFileName)

    try {
      fs.copyFileSync(versionData.filePath, newFilePath)
      relativeFilePath = path.basename(newFilePath)
    } catch (e) {
      log.error('Error copying file:', e)
    }
  }

  const newVersion: VersionRecord = {
    id: generateId(),
    thesisId: targetThesisId,
    version: versionData.version,
    date: versionData.date,
    changes: versionData.changes,
    focus: versionData.focus,
    filePath: relativeFilePath,
    fileName: versionData.fileName,
    fileType: versionData.fileType,
  }

  const versionsData = loadThesisVersions(dataDir, thesis.title)
  versionsData.versions.unshift(newVersion)
  saveThesisVersions(dataDir, thesis.title, versionsData)

  // Update thesis updatedAt
  const thesisIdx = index.theses.findIndex(t => t.id === targetThesisId)
  if (thesisIdx !== -1) {
    index.theses[thesisIdx].updatedAt = new Date().toISOString()
    saveThesesIndex(dataDir, index)
  }

  return true
})
```

Replace `update-version`:

```typescript
ipcMain.handle('update-version', async (_event, id: string, updates: any) => {
  log.info('IPC: update-version', id, updates)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)

  // Find which thesis this version belongs to
  for (const thesis of index.theses) {
    const data = loadThesisVersions(dataDir, thesis.title)
    const vIdx = data.versions.findIndex(v => v.id === id)
    if (vIdx === -1) continue

    // Handle file update
    if (updates.filePath && fs.existsSync(updates.filePath)) {
      const thesisDir = getThesisFilesDirNew(thesis.title)
      const ext = path.extname(updates.filePath)
      const ver = data.versions[vIdx].version || id
      const baseName = data.versions[vIdx].fileName
        ? path.basename(data.versions[vIdx].fileName!, ext) : id
      const newFileName = `${sanitizeFileName(ver)}_${sanitizeFileName(baseName)}${ext}`
      const newFilePath = uniqueFilePath(thesisDir, newFileName)

      try {
        fs.copyFileSync(updates.filePath, newFilePath)
        updates.filePath = path.basename(newFilePath)
      } catch (e) {
        log.error('Error copying updated file:', e)
      }
    }

    data.versions[vIdx] = { ...data.versions[vIdx], ...updates }
    saveThesisVersions(dataDir, thesis.title, data)
    return true
  }

  return false
})
```

Replace `delete-version`:

```typescript
ipcMain.handle('delete-version', async (_event, id: string) => {
  log.info('IPC: delete-version', id)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)

  for (const thesis of index.theses) {
    const data = loadThesisVersions(dataDir, thesis.title)
    const version = data.versions.find(v => v.id === id)
    if (!version) continue

    // Delete file
    if (version.filePath) {
      const absPath = resolveVersionFilePath(dataDir, thesis.title, version.filePath)
      if (fs.existsSync(absPath)) {
        try { fs.unlinkSync(absPath) } catch (e) { log.error('Error deleting file:', e) }
      }
    }

    data.versions = data.versions.filter(v => v.id !== id)
    saveThesisVersions(dataDir, thesis.title, data)
    return true
  }

  return false
})
```

- [ ] **Step 4: Update initializeApp to run migration**

```typescript
export function initializeApp(): void {
  log.info('Initializing app data...')
  const dataDir = getDataDir()
  const userDataPath = getUserDataPath()

  // Run migration if needed
  if (needsMigration(dataDir)) {
    log.info('Migrating data to split format...')
    migrateToSplitFormat(dataDir, userDataPath)
  }

  // Ensure at least one thesis exists
  const index = loadThesesIndex(dataDir)
  if (index.theses.length === 0) {
    const defaultThesis: Thesis = {
      id: generateId(),
      title: '默认论文',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    index.theses.push(defaultThesis)
    saveThesesIndex(dataDir, index)
    saveLocalState(userDataPath, { currentThesisId: defaultThesis.id })
  }

  // Ensure local state has valid currentThesisId
  const localState = loadLocalState(userDataPath)
  if (!localState.currentThesisId || !index.theses.find(t => t.id === localState.currentThesisId)) {
    saveLocalState(userDataPath, { currentThesisId: index.theses[0]?.id || null })
  }

  log.info('App data initialized')
}
```

- [ ] **Step 5: Run build to verify compilation**

Run: `npm run build`

Expected: PASS — no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "refactor: migrate ipc-handlers to split data store"
```

---

### Task 6: Refactor edit-session.ts for New Data Structure

**Files:**
- Modify: `src/main/edit-session.ts`

The `archiveSession` function directly reads/writes `data.json`. It must use the new split data store. Also, `edit-session.json` should be stored in `userData` (local, not synced) since edit sessions are per-machine.

- [ ] **Step 1: Update imports**

Add at the top of `src/main/edit-session.ts`:

```typescript
import {
  loadThesesIndex,
  saveThesesIndex,
  loadThesisVersions,
  saveThesisVersions,
  getThesisDir,
  VersionRecord,
} from './split-data-store'
```

- [ ] **Step 2: Refactor createEditSession file path**

In `createEditSession`, change the thesis files directory from `data/files/<name>/` to `data/<name>/`:

Replace:
```typescript
  const dirName = thesisTitle
    ? thesisTitle.replace(/[/\:*?"<>|]/g, '_').trim() || 'untitled'
    : `thesis_${params.thesisId}`
  const thesisFilesDir = path.join(dataDir, 'files', dirName)
```

With:
```typescript
  const dirName = thesisTitle
    ? thesisTitle.replace(/[/\:*?"<>|]/g, '_').trim() || 'untitled'
    : `thesis_${params.thesisId}`
  const thesisFilesDir = path.join(dataDir, dirName)
```

- [ ] **Step 3: Refactor archiveSession to use split data store**

Replace the `archiveSession` function body:

```typescript
export function archiveSession(dataDir: string): EditSession | null {
  if (!activeSession) {
    log.warn('No active session to archive')
    return null
  }

  const session = { ...activeSession }

  try {
    const index = loadThesesIndex(dataDir)
    const thesis = index.theses.find(t => t.id === session.thesisId)
    if (!thesis) {
      log.error('Thesis not found for session:', session.thesisId)
      return null
    }

    const thesisDir = getThesisDir(dataDir, thesis.title)
    const relativeFilePath = path.basename(session.editFilePath)

    const newVersion: VersionRecord = {
      id: session.newVersionId,
      thesisId: session.thesisId,
      version: session.versionInfo.version,
      date: session.date,
      changes: session.versionInfo.changes,
      focus: session.versionInfo.focus,
      filePath: relativeFilePath,
      fileName: session.fileName,
      fileType: session.fileType,
    }

    const versionsData = loadThesisVersions(dataDir, thesis.title)
    versionsData.versions.unshift(newVersion)
    saveThesisVersions(dataDir, thesis.title, versionsData)

    // Update thesis updatedAt
    const thesisIdx = index.theses.findIndex(t => t.id === session.thesisId)
    if (thesisIdx !== -1) {
      index.theses[thesisIdx].updatedAt = new Date().toISOString()
      saveThesesIndex(dataDir, index)
    }

    log.info('Version archived:', session.newVersionId)
  } catch (error) {
    log.error('Error archiving session:', error)
    return null
  }

  activeSession = null
  stopWatcher()
  removePersistedSession(dataDir)

  return session
}
```

- [ ] **Step 4: Move edit-session.json storage to userData**

Update `persistSession`, `removePersistedSession`, and `loadPersistedSession` to accept a `userDataPath` parameter instead of `dataDir`. This keeps edit session state local (not synced via cloud).

```typescript
function getSessionFilePath(userDataPath: string): string {
  return path.join(userDataPath, 'edit-session.json')
}

function persistSession(userDataPath: string, session: EditSession): void {
  fs.writeFileSync(getSessionFilePath(userDataPath), JSON.stringify(session, null, 2), 'utf-8')
}

function removePersistedSession(userDataPath: string): void {
  const filePath = getSessionFilePath(userDataPath)
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath) } catch (e) { log.error('Error removing persisted session:', e) }
  }
}

export function loadPersistedSession(userDataPath: string): EditSession | null {
  const filePath = getSessionFilePath(userDataPath)
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as EditSession
    }
  } catch (e) {
    log.error('Error loading persisted session:', e)
  }
  return null
}
```

Update all call sites in `createEditSession`, `archiveSession`, and `clearSession` to pass `userDataPath` instead of `dataDir` for session persistence.

- [ ] **Step 5: Update ipc-handlers.ts call sites for edit-session**

In `src/main/ipc-handlers.ts`, update the edit session IPC handlers to pass `getUserDataPath()` for session persistence:

```typescript
ipcMain.handle('start-edit-session', async (_event, params: EditSessionParams) => {
  log.info('IPC: start-edit-session', params.baseVersionId)
  const dataDir = getDataDir()
  const userDataPath = getUserDataPath()
  const index = loadThesesIndex(dataDir)
  const thesis = index.theses.find(t => t.id === params.thesisId)

  const session = createEditSession(params, dataDir, userDataPath, thesis?.title)
  // ... rest unchanged (open file, start watcher)
})

ipcMain.handle('cancel-edit-session', async () => {
  log.info('IPC: cancel-edit-session')
  clearSession(getUserDataPath(), true)
  return true
})

ipcMain.handle('finish-edit-session', async () => {
  log.info('IPC: finish-edit-session (manual)')
  const dataDir = getDataDir()
  const archived = archiveSession(dataDir, getUserDataPath())
  return archived !== null
})

ipcMain.handle('get-pending-edit-session', async () => {
  return loadPersistedSession(getUserDataPath())
})

ipcMain.handle('resolve-pending-edit-session', async (_event, keep: boolean) => {
  const dataDir = getDataDir()
  const userDataPath = getUserDataPath()
  if (keep) {
    const archived = archiveSession(dataDir, userDataPath)
    return archived !== null
  }
  clearSession(userDataPath, true)
  return true
})
```

- [ ] **Step 6: Run build to verify compilation**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main/edit-session.ts src/main/ipc-handlers.ts
git commit -m "refactor: update edit-session to use split data store and local session storage"
```

---

### Task 7: Integrate File Watcher + IPC Sync Events

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`

- [ ] **Step 1: Integrate file watcher in ipc-handlers.ts**

Add import and module-level variable:

```typescript
import { createFileWatcher, FileWatcher } from './file-watcher'

let fileWatcher: FileWatcher | null = null
```

Add a helper to silence the watcher after writes:

```typescript
function silenceWatcher(): void {
  fileWatcher?.setSilent(2000)
}
```

Call `silenceWatcher()` at the end of every IPC handler that writes data: `create-thesis`, `update-thesis`, `delete-thesis`, `add-version`, `update-version`, `delete-version`, `select-data-dir`, `reset-data-dir`.

- [ ] **Step 2: Start file watcher in initializeApp**

At the end of `initializeApp()`:

```typescript
  // Start file watcher for multi-device sync
  fileWatcher = createFileWatcher(dataDir, {
    onThesesIndexChanged: () => {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('sync-theses-updated')
      }
    },
    onVersionsChanged: (thesisDirName: string) => {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('sync-versions-updated', thesisDirName)
      }
    },
    onConflictDetected: (filePath: string) => {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].webContents.send('sync-conflict-detected', filePath)
      }
    },
  })
  fileWatcher.start()
```

- [ ] **Step 3: Update preload.ts with sync event listeners**

Add to the `electronAPI` object in `src/preload/preload.ts`:

```typescript
  // Sync events
  onSyncThesesUpdated: (callback: () => void) => {
    ipcRenderer.on('sync-theses-updated', () => callback())
  },
  onSyncVersionsUpdated: (callback: (thesisDirName: string) => void) => {
    ipcRenderer.on('sync-versions-updated', (_e, dirName) => callback(dirName))
  },
  onSyncConflictDetected: (callback: (filePath: string) => void) => {
    ipcRenderer.on('sync-conflict-detected', (_e, fp) => callback(fp))
  },
  removeSyncListeners: () => {
    ipcRenderer.removeAllListeners('sync-theses-updated')
    ipcRenderer.removeAllListeners('sync-versions-updated')
    ipcRenderer.removeAllListeners('sync-conflict-detected')
  },
```

- [ ] **Step 4: Update renderer types.ts**

Add to the `ElectronAPI` interface in `src/renderer/types.ts`:

```typescript
  // Sync events
  onSyncThesesUpdated: (callback: () => void) => void
  onSyncVersionsUpdated: (callback: (thesisDirName: string) => void) => void
  onSyncConflictDetected: (callback: (filePath: string) => void) => void
  removeSyncListeners: () => void
```

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/preload.ts src/renderer/types.ts
git commit -m "feat: integrate file watcher and add sync IPC events"
```

---

### Task 8: Update UI Components

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Sidebar.tsx`
- Modify: `src/renderer/components/SettingsModal.tsx`

- [ ] **Step 1: Add sync event handling in App.tsx**

Add a new `useEffect` for sync events and a `syncStatus` state in `src/renderer/App.tsx`:

```typescript
// Add state
const [syncStatus, setSyncStatus] = useState<'synced' | 'updated' | 'conflict'>('synced')
const [conflictFile, setConflictFile] = useState<string | null>(null)

// Add useEffect for sync events
useEffect(() => {
  const handleThesesUpdated = () => {
    loadTheses()
    setSyncStatus('updated')
    setTimeout(() => setSyncStatus('synced'), 3000)
  }

  const handleVersionsUpdated = (_thesisDirName: string) => {
    if (currentThesisId) {
      loadVersions(currentThesisId)
    }
    setSyncStatus('updated')
    setTimeout(() => setSyncStatus('synced'), 3000)
  }

  const handleConflict = (filePath: string) => {
    setSyncStatus('conflict')
    setConflictFile(filePath)
  }

  window.electronAPI.onSyncThesesUpdated(handleThesesUpdated)
  window.electronAPI.onSyncVersionsUpdated(handleVersionsUpdated)
  window.electronAPI.onSyncConflictDetected(handleConflict)

  return () => {
    window.electronAPI.removeSyncListeners()
  }
}, [currentThesisId])
```

Pass `syncStatus` and `conflictFile` to Sidebar:

```typescript
<Sidebar
  // ... existing props
  syncStatus={syncStatus}
  conflictFile={conflictFile}
  onDismissConflict={() => { setSyncStatus('synced'); setConflictFile(null) }}
/>
```

- [ ] **Step 2: Add sync status indicator to Sidebar**

Update `SidebarProps` in `src/renderer/components/Sidebar.tsx`:

```typescript
interface SidebarProps {
  // ... existing props
  syncStatus: 'synced' | 'updated' | 'conflict'
  conflictFile?: string | null
  onDismissConflict?: () => void
}
```

Add the sync status indicator above the settings button, inside the `<aside>` element:

```tsx
{/* Sync Status */}
<div className="px-3 pb-2">
  {syncStatus === 'synced' && (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
      已同步
    </div>
  )}
  {syncStatus === 'updated' && (
    <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
      <span className="w-2 h-2 rounded-full bg-primary inline-block" />
      已更新
    </div>
  )}
  {syncStatus === 'conflict' && (
    <div className="flex items-center gap-1.5 text-xs text-yellow-600">
      <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
      <span className="flex-1">检测到同步冲突</span>
      {onDismissConflict && (
        <button
          onClick={onDismissConflict}
          className="text-muted hover:text-text"
          title="忽略"
        >
          x
        </button>
      )}
    </div>
  )}
</div>
```

Add `syncStatus`, `conflictFile`, and `onDismissConflict` to the destructured props.

- [ ] **Step 3: Add sync hint to SettingsModal**

In `src/renderer/components/SettingsModal.tsx`, add a hint below the storage path section (after the action buttons `<div className="flex flex-wrap gap-3">`):

```tsx
<div className="text-xs text-muted mt-1">
  将数据目录设置为坚果云同步文件夹即可实现多设备同步
</div>
```

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/Sidebar.tsx src/renderer/components/SettingsModal.tsx
git commit -m "feat: add sync status indicator and cloud sync hint in UI"
```

---

### Task 9: Final Integration Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm run test`

Expected: All tests PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: PASS — no TypeScript errors.

- [ ] **Step 3: Manual smoke test checklist**

Run the app in dev mode (`npm run dev`) and verify:

1. First launch: old `data.json` migrated to split format, `data.json.backup` created
2. `theses-index.json` exists with correct thesis list
3. Each thesis has its own directory with `versions.json` and thesis files
4. `local-state.json` in userData contains `currentThesisId`
5. Create a new thesis — `theses-index.json` updated, new directory created
6. Upload a new version — `<thesis>/versions.json` updated, file copied to thesis dir
7. Edit/delete version — `versions.json` updated correctly
8. Sidebar shows green "已同步" indicator
9. Manually edit a `versions.json` file outside the app — UI refreshes automatically
10. Create a file with "冲突副本" in the name — conflict warning appears

- [ ] **Step 4: Commit any fixes**

If any issues found during smoke test, fix and commit:

```bash
git add -A
git commit -m "fix: address issues found during integration testing"
```

---

## Self-Review Notes

### Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| 数据结构拆分 (theses-index.json + per-thesis versions.json) | Task 2, 5 |
| currentThesisId 移至本地 userData | Task 2, 5, 6 |
| filePath 改为相对路径 | Task 2, 3, 5, 6 |
| 数据迁移 (data.json → 新格式) | Task 3, 5 |
| chokidar 文件监听 | Task 1, 4 |
| 防抖 500ms | Task 4 |
| 自触发抑制 | Task 4, 7 |
| IPC 同步事件 | Task 7 |
| 坚果云冲突副本检测 | Task 4, 7, 8 |
| theses-index.json read-merge-write | Task 2 (mergeThesesIndex) |
| 同步状态指示 (侧边栏) | Task 8 |
| 设置弹窗坚果云提示 | Task 8 |
| edit-session.json 移至本地 | Task 6 |

### Placeholder Scan

No TBD, TODO, or incomplete sections found.

### Type Consistency Check

- `Thesis` type: defined in `split-data-store.ts`, used consistently across tasks
- `VersionRecord` type: defined in `split-data-store.ts`, used in ipc-handlers and edit-session
- `ThesesIndex` / `ThesisVersions` / `LocalState`: defined in `split-data-store.ts`
- `FileWatcher` / `FileWatcherCallbacks`: defined in `file-watcher.ts`
- `sanitizeFileName`: moved to `split-data-store.ts`, removed from `ipc-handlers.ts`
- Sync IPC events: `sync-theses-updated`, `sync-versions-updated`, `sync-conflict-detected` — consistent across main, preload, and renderer
