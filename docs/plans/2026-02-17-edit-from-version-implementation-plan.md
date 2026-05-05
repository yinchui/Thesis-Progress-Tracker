# 基于版本修改 Implementation Plan

> **For Assistant:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在版本详情中点击「基于此版本修改」，预填信息后复制文件并打开外部编辑器，通过锁文件检测（doc/docx）或手动确认（txt/pdf）完成归档为新版本。

**Architecture:** 新增主进程 `edit-session.ts` 模块管理编辑会话（文件复制、锁文件监听、归档）。新增 3 个 IPC 通道连接前后端。前端新增 `EditVersionModal`（预填表单）和 `EditSessionBar`（编辑状态栏）组件，集成到 `App.tsx` 和 `Timeline.tsx`。

**Tech Stack:** Electron `fs.watch` / `shell.openPath`，React state + `ipcRenderer.on` 事件监听，Vitest 单元测试。

---

### Task 1: 版本号自动递增工具函数

**Files:**
- Create: `src/main/version-utils.ts`
- Test: `tests/main/version-utils.test.ts`

**Step 1: Write the failing tests**

Create `tests/main/version-utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { incrementVersion } from '../../src/main/version-utils'

describe('incrementVersion', () => {
  it('increments last number in v1.0', () => {
    expect(incrementVersion('v1.0')).toBe('v1.1')
  })

  it('increments v1.9 to v1.10', () => {
    expect(incrementVersion('v1.9')).toBe('v1.10')
  })

  it('increments v2 to v3', () => {
    expect(incrementVersion('v2')).toBe('v3')
  })

  it('returns original when no number found', () => {
    expect(incrementVersion('第一稿')).toBe('第一稿')
  })

  it('increments only the last number in v1.2.3', () => {
    expect(incrementVersion('v1.2.3')).toBe('v1.2.4')
  })

  it('handles empty string', () => {
    expect(incrementVersion('')).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/version-utils.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/main/version-utils.ts`:

```ts
/**
 * Increment the last number in a version string.
 * "v1.0" → "v1.1", "v2" → "v3", "第一稿" → "第一稿"
 */
export function incrementVersion(version: string): string {
  const match = version.match(/^(.*?)(\d+)(\D*)$/)
  if (!match) return version
  const [, prefix, num, suffix] = match
  return `${prefix}${parseInt(num, 10) + 1}${suffix}`
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/version-utils.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/main/version-utils.ts tests/main/version-utils.test.ts
git commit -m "feat: add incrementVersion utility"
```

---

### Task 2: 锁文件路径工具函数

**Files:**
- Modify: `src/main/version-utils.ts` (append)
- Modify: `tests/main/version-utils.test.ts` (append)

**Step 1: Write the failing tests**

Append to `tests/main/version-utils.test.ts`:

```ts
import { incrementVersion, getLockFilePath, supportsAutoArchive } from '../../src/main/version-utils'

describe('getLockFilePath', () => {
  it('returns ~$ prefixed path for docx', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.docx'))
      .toBe('/data/files/thesis_1/~$version_abc.docx')
  })

  it('returns ~$ prefixed path for doc', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.doc'))
      .toBe('/data/files/thesis_1/~$version_abc.doc')
  })

  it('returns null for txt', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.txt')).toBeNull()
  })

  it('returns null for pdf', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.pdf')).toBeNull()
  })
})

describe('supportsAutoArchive', () => {
  it('returns true for doc', () => {
    expect(supportsAutoArchive('doc')).toBe(true)
  })
  it('returns true for docx', () => {
    expect(supportsAutoArchive('docx')).toBe(true)
  })
  it('returns true for DOC (case insensitive)', () => {
    expect(supportsAutoArchive('DOC')).toBe(true)
  })
  it('returns false for txt', () => {
    expect(supportsAutoArchive('txt')).toBe(false)
  })
  it('returns false for pdf', () => {
    expect(supportsAutoArchive('pdf')).toBe(false)
  })
})
```

Also update the import at the top of the test file to include the new exports.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/version-utils.test.ts`
Expected: FAIL — getLockFilePath / supportsAutoArchive not found

**Step 3: Write minimal implementation**

Append to `src/main/version-utils.ts`:

```ts
import * as path from 'path'

const AUTO_ARCHIVE_EXTENSIONS = new Set(['doc', 'docx'])

/**
 * Check if a file extension supports auto-archive (lock file detection).
 */
export function supportsAutoArchive(ext: string): boolean {
  return AUTO_ARCHIVE_EXTENSIONS.has(ext.toLowerCase())
}

/**
 * Get the expected lock file path for a given file.
 * Word/WPS create ~$filename.docx when editing.
 * Returns null for unsupported file types.
 */
export function getLockFilePath(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  if (!supportsAutoArchive(ext)) return null
  const dir = path.dirname(filePath)
  const basename = path.basename(filePath)
  return path.join(dir, `~$${basename}`)
}
```

Note: Move the `import * as path from 'path'` to the top of the file.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/version-utils.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/main/version-utils.ts tests/main/version-utils.test.ts
git commit -m "feat: add lock file path and auto-archive detection utils"
```

---

### Task 3: EditSession 类型定义

**Files:**
- Create: `src/main/edit-session-types.ts`
- Modify: `src/renderer/types.ts` (append EditSession types for renderer)

**Step 1: Create the shared type definition**

Create `src/main/edit-session-types.ts`:

```ts
export interface EditSessionParams {
  baseVersionId: string
  thesisId: string
  baseFilePath: string
  baseFileName: string
  baseFileType: string
  versionInfo: {
    version: string
    changes: string
    focus: string
  }
  /** If user uploaded a replacement file, use this path instead of baseFilePath */
  replacementFilePath?: string
}

export interface EditSession {
  newVersionId: string
  baseVersionId: string
  thesisId: string
  versionInfo: {
    version: string
    changes: string
    focus: string
  }
  editFilePath: string
  fileName: string
  fileType: string
  autoArchive: boolean
  date: string
}
```

**Step 2: Add renderer-side types**

Append to `src/renderer/types.ts` (before the `declare global` block):

```ts
export interface EditSession {
  newVersionId: string
  baseVersionId: string
  thesisId: string
  versionInfo: {
    version: string
    changes: string
    focus: string
  }
  editFilePath: string
  fileName: string
  fileType: string
  autoArchive: boolean
  date: string
}
```

Also add to the `ElectronAPI` interface inside `src/renderer/types.ts`:

```ts
  // 编辑会话
  startEditSession: (params: {
    baseVersionId: string
    thesisId: string
    baseFilePath: string
    baseFileName: string
    baseFileType: string
    versionInfo: { version: string; changes: string; focus: string }
    replacementFilePath?: string
  }) => Promise<EditSession>
  cancelEditSession: () => Promise<boolean>
  finishEditSession: () => Promise<boolean>
  onEditSessionFinished: (callback: (session: EditSession) => void) => void
  removeEditSessionListener: () => void
```

**Step 3: Commit**

```bash
git add src/main/edit-session-types.ts src/renderer/types.ts
git commit -m "feat: add EditSession type definitions"
```

---

### Task 4: 主进程 edit-session 模块 — 核心逻辑

**Files:**
- Create: `src/main/edit-session.ts`
- Test: `tests/main/edit-session.test.ts`

**Step 1: Write the failing tests**

Create `tests/main/edit-session.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  createEditSession,
  getActiveSession,
  clearSession,
  loadPersistedSession,
  archiveSession,
} from '../../src/main/edit-session'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edit-session-test-'))
  // Create a fake source file
  fs.mkdirSync(path.join(tmpDir, 'files', 'thesis_t1'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'files', 'thesis_t1', 'version_base.docx'), 'base content')
  // Create empty data.json
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
    // Create a txt source file
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

    // Session should be cleared
    expect(getActiveSession()).toBeNull()
    expect(fs.existsSync(path.join(tmpDir, 'edit-session.json'))).toBe(false)

    // data.json should have 2 versions
    const data = JSON.parse(fs.readFileSync(path.join(tmpDir, 'data.json'), 'utf-8'))
    expect(data.versions).toHaveLength(2)
    expect(data.versions[0].version).toBe('v1.1')
    expect(data.versions[0].id).toBe(session.newVersionId)
    // File should still exist (not deleted during archive)
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

    // Simulate app restart by clearing in-memory session
    clearSession()  // no dataDir, no file cleanup

    const loaded = loadPersistedSession(tmpDir)
    expect(loaded).not.toBeNull()
    expect(loaded!.versionInfo.version).toBe('v1.1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/edit-session.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `src/main/edit-session.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import log from 'electron-log';
import { EditSession, EditSessionParams } from './edit-session-types';
import { supportsAutoArchive } from './version-utils';

let activeSession: EditSession | null = null;
let activeWatcher: fs.FSWatcher | null = null;

export function getActiveSession(): EditSession | null {
  return activeSession;
}

/**
 * Create a new edit session: copy file, persist session, return session object.
 * Does NOT open the file or start watching — caller handles that.
 */
export function createEditSession(params: EditSessionParams, dataDir: string): EditSession {
  if (activeSession) {
    throw new Error('已有一个编辑会话正在进行中，请先完成或取消当前编辑。');
  }

  const newVersionId = crypto.randomUUID();
  const ext = path.extname(params.baseFilePath);
  const fileType = ext.slice(1).toUpperCase();
  const autoArchive = supportsAutoArchive(ext.slice(1));

  // Determine source file: replacement or base
  const sourceFilePath = params.replacementFilePath || params.baseFilePath;

  // Copy to final location
  const thesisFilesDir = path.join(dataDir, 'files', `thesis_${params.thesisId}`);
  if (!fs.existsSync(thesisFilesDir)) {
    fs.mkdirSync(thesisFilesDir, { recursive: true });
  }
  const editFileName = `version_${newVersionId}${ext}`;
  const editFilePath = path.join(thesisFilesDir, editFileName);

  fs.copyFileSync(sourceFilePath, editFilePath);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const session: EditSession = {
    newVersionId,
    baseVersionId: params.baseVersionId,
    thesisId: params.thesisId,
    versionInfo: params.versionInfo,
    editFilePath,
    fileName: params.baseFileName,
    fileType,
    autoArchive,
    date: dateStr,
  };

  activeSession = session;
  persistSession(dataDir, session);
  log.info('Edit session created:', session.newVersionId);

  return session;
}

/**
 * Archive the active session: write version to data.json, clean up session.
 * Returns the archived session for notification purposes.
 */
export function archiveSession(dataDir: string): EditSession | null {
  if (!activeSession) {
    log.warn('No active session to archive');
    return null;
  }

  const session = { ...activeSession };

  // Write to data.json
  const dataFilePath = path.join(dataDir, 'data.json');
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    const data = JSON.parse(raw);

    const newVersion = {
      id: session.newVersionId,
      thesisId: session.thesisId,
      version: session.versionInfo.version,
      date: session.date,
      changes: session.versionInfo.changes,
      focus: session.versionInfo.focus,
      filePath: session.editFilePath,
      fileName: session.fileName,
      fileType: session.fileType,
    };

    data.versions.unshift(newVersion);

    // Update thesis updatedAt
    const thesisIndex = data.theses.findIndex((t: any) => t.id === session.thesisId);
    if (thesisIndex !== -1) {
      data.theses[thesisIndex].updatedAt = new Date().toISOString();
    }

    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    log.info('Version archived:', session.newVersionId);
  } catch (error) {
    log.error('Error archiving session:', error);
    return null;
  }

  // Clean up session (keep the file — it's the new version)
  activeSession = null;
  stopWatcher();
  removePersistedSession(dataDir);

  return session;
}

/**
 * Clear the active session. If deleteFile=true, also delete the copied file.
 */
export function clearSession(dataDir?: string, deleteFile?: boolean): void {
  if (deleteFile && activeSession && fs.existsSync(activeSession.editFilePath)) {
    try {
      fs.unlinkSync(activeSession.editFilePath);
      log.info('Deleted edit file:', activeSession.editFilePath);
    } catch (e) {
      log.error('Error deleting edit file:', e);
    }
  }

  activeSession = null;
  stopWatcher();

  if (dataDir) {
    removePersistedSession(dataDir);
  }
}

/**
 * Start watching for lock file deletion (auto-archive).
 * Call onArchive when the lock file is deleted (debounced 2s).
 */
export function startLockFileWatch(
  session: EditSession,
  onArchive: () => void,
  onError: () => void,
): void {
  const dir = path.dirname(session.editFilePath);
  const lockFileName = `~$${path.basename(session.editFilePath)}`;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  try {
    activeWatcher = fs.watch(dir, (eventType, filename) => {
      if (filename !== lockFileName) return;

      // Lock file event detected — check if it was deleted
      const lockPath = path.join(dir, lockFileName);
      if (!fs.existsSync(lockPath)) {
        // Lock file deleted — debounce 2 seconds before archiving
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // Re-check: if lock file still doesn't exist, archive
          if (!fs.existsSync(lockPath)) {
            log.info('Lock file deleted, auto-archiving');
            onArchive();
          }
        }, 2000);
      } else {
        // Lock file (re)created — cancel pending archive
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
      }
    });

    activeWatcher.on('error', (err) => {
      log.error('Lock file watcher error:', err);
      stopWatcher();
      onError();
    });

    log.info('Started lock file watch for:', lockFileName);
  } catch (err) {
    log.error('Failed to start lock file watch:', err);
    onError();
  }
}

export function stopWatcher(): void {
  if (activeWatcher) {
    activeWatcher.close();
    activeWatcher = null;
  }
}

// ==================== Persistence ====================

function persistSession(dataDir: string, session: EditSession): void {
  const filePath = path.join(dataDir, 'edit-session.json');
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
}

function removePersistedSession(dataDir: string): void {
  const filePath = path.join(dataDir, 'edit-session.json');
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      log.error('Error removing persisted session:', e);
    }
  }
}

export function loadPersistedSession(dataDir: string): EditSession | null {
  const filePath = path.join(dataDir, 'edit-session.json');
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as EditSession;
    }
  } catch (e) {
    log.error('Error loading persisted session:', e);
  }
  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/edit-session.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/main/edit-session.ts tests/main/edit-session.test.ts
git commit -m "feat: add edit-session core module with create/archive/clear/persist"
```

---

### Task 5: IPC Handlers 注册

**Files:**
- Modify: `src/main/ipc-handlers.ts` (append edit-session IPC handlers)
- Test: `tests/main/edit-session-ipc-contract.test.ts`

**Step 1: Write the contract test**

Create `tests/main/edit-session-ipc-contract.test.ts`:

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/edit-session-ipc-contract.test.ts`
Expected: FAIL — strings not found in source

**Step 3: Add IPC handlers**

Append to `src/main/ipc-handlers.ts`, before `export function initializeApp()`:

```ts
import {
  createEditSession,
  getActiveSession,
  clearSession,
  archiveSession,
  startLockFileWatch,
  loadPersistedSession,
} from './edit-session';
import { EditSessionParams } from './edit-session-types';

// ==================== Edit Session IPC Handlers ====================

ipcMain.handle('start-edit-session', async (_event, params: EditSessionParams) => {
  log.info('IPC: start-edit-session', params.baseVersionId);
  const dataDir = getDataDir();

  const session = createEditSession(params, dataDir);

  // Open file with system default program
  const openResult = await shell.openPath(session.editFilePath);
  if (openResult) {
    // openPath returns error string on failure, empty string on success
    log.error('Failed to open file:', openResult);
    clearSession(dataDir, true);
    throw new Error(`未找到可打开此文件的程序: ${openResult}`);
  }

  // Start lock file watch for auto-archive types
  if (session.autoArchive) {
    startLockFileWatch(
      session,
      () => {
        // Auto-archive callback
        const archived = archiveSession(dataDir);
        if (archived) {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send('finish-edit-session', archived);
          }
        }
      },
      () => {
        // Error callback — notify renderer to show manual finish button
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('edit-session-watch-error');
        }
      },
    );
  }

  return session;
});

ipcMain.handle('cancel-edit-session', async () => {
  log.info('IPC: cancel-edit-session');
  const dataDir = getDataDir();
  clearSession(dataDir, true);
  return true;
});

ipcMain.handle('finish-edit-session', async () => {
  log.info('IPC: finish-edit-session (manual)');
  const dataDir = getDataDir();
  const archived = archiveSession(dataDir);
  if (archived) {
    return true;
  }
  return false;
});
```

Also add to `initializeApp()` — check for persisted session on startup. Modify the existing function:

```ts
export function initializeApp(): void {
  log.info('Initializing app data...');
  ensureDefaultThesis();

  // Check for unfinished edit session from previous run
  const dataDir = getDataDir();
  const persisted = loadPersistedSession(dataDir);
  if (persisted) {
    log.info('Found unfinished edit session:', persisted.newVersionId);
    // Will be handled by renderer on load via get-pending-edit-session
  }

  log.info('App data initialized');
}
```

Add one more IPC handler for the startup recovery:

```ts
ipcMain.handle('get-pending-edit-session', async () => {
  const dataDir = getDataDir();
  return loadPersistedSession(dataDir);
});

ipcMain.handle('resolve-pending-edit-session', async (_event, keep: boolean) => {
  const dataDir = getDataDir();
  if (keep) {
    const archived = archiveSession(dataDir);
    return archived !== null;
  } else {
    clearSession(dataDir, true);
    return true;
  }
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/edit-session-ipc-contract.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts tests/main/edit-session-ipc-contract.test.ts
git commit -m "feat: register edit-session IPC handlers"
```

---

### Task 6: Preload API 扩展

**Files:**
- Modify: `src/preload/preload.ts` (add edit-session APIs)
- Modify: `src/renderer/types.ts` (already done in Task 3; verify)
- Modify: `tests/release/preload-api-contract.test.ts` (add assertions)

**Step 1: Write the failing test**

Append to `tests/release/preload-api-contract.test.ts`:

```ts
  it('includes edit session methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('startEditSession')
    expect(source).toContain('cancelEditSession')
    expect(source).toContain('finishEditSession')
    expect(source).toContain('onEditSessionFinished')
    expect(source).toContain('removeEditSessionListener')
    expect(source).toContain('getPendingEditSession')
    expect(source).toContain('resolvePendingEditSession')
    expect(source).toContain('onEditSessionWatchError')
  })
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/release/preload-api-contract.test.ts`
Expected: FAIL

**Step 3: Add preload APIs**

Add to the `electronAPI` object in `src/preload/preload.ts`, inside the object before the closing `}`:

```ts
  // Edit session
  startEditSession: (params: {
    baseVersionId: string;
    thesisId: string;
    baseFilePath: string;
    baseFileName: string;
    baseFileType: string;
    versionInfo: { version: string; changes: string; focus: string };
    replacementFilePath?: string;
  }) => ipcRenderer.invoke('start-edit-session', params),
  cancelEditSession: (): Promise<boolean> => ipcRenderer.invoke('cancel-edit-session'),
  finishEditSession: (): Promise<boolean> => ipcRenderer.invoke('finish-edit-session'),
  onEditSessionFinished: (callback: (_event: any, session: any) => void) => {
    ipcRenderer.on('finish-edit-session', callback);
  },
  removeEditSessionListener: () => {
    ipcRenderer.removeAllListeners('finish-edit-session');
  },
  onEditSessionWatchError: (callback: () => void) => {
    ipcRenderer.on('edit-session-watch-error', (_event) => callback());
  },
  getPendingEditSession: () => ipcRenderer.invoke('get-pending-edit-session'),
  resolvePendingEditSession: (keep: boolean): Promise<boolean> =>
    ipcRenderer.invoke('resolve-pending-edit-session', keep),
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/release/preload-api-contract.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/preload/preload.ts tests/release/preload-api-contract.test.ts
git commit -m "feat: expose edit session APIs in preload"
```

---

### Task 7: EditSessionBar 组件

**Files:**
- Create: `src/renderer/components/EditSessionBar.tsx`

**Step 1: Create the component**

Create `src/renderer/components/EditSessionBar.tsx`:

```tsx
interface EditSessionBarProps {
  baseVersion: string
  newVersion: string
  autoArchive: boolean
  onCancel: () => void
  onFinish: () => void
}

function EditSessionBar({ baseVersion, newVersion, autoArchive, onCancel, onFinish }: EditSessionBarProps) {
  return (
    <div className="rounded-base bg-accent border border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">📝</span>
        <span className="text-text text-sm font-bold">
          正在编辑 {newVersion}
        </span>
        <span className="text-muted text-xs">
          （基于 {baseVersion}）
        </span>
        {autoArchive && (
          <span className="text-muted text-xs ml-2">关闭文件后自动保存</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!autoArchive && (
          <button
            onClick={onFinish}
            className="h-8 px-3 rounded-base bg-primary text-white font-bold text-xs hover:opacity-90 transition-opacity"
          >
            完成修改
          </button>
        )}
        <button
          onClick={onCancel}
          className="h-8 px-3 rounded-base border border-border text-text font-bold text-xs hover:bg-gray-50 transition-colors"
        >
          取消编辑
        </button>
      </div>
    </div>
  )
}

export default EditSessionBar
```

**Step 2: Commit**

```bash
git add src/renderer/components/EditSessionBar.tsx
git commit -m "feat: add EditSessionBar component"
```

---

### Task 8: EditVersionModal 组件

**Files:**
- Create: `src/renderer/components/EditVersionModal.tsx`

**Step 1: Create the component**

Create `src/renderer/components/EditVersionModal.tsx`:

```tsx
import { useState } from 'react'
import { Version } from '../App'

interface EditVersionModalProps {
  baseVersion: Version
  suggestedVersion: string
  onClose: () => void
  onSubmit: (versionInfo: {
    version: string
    changes: string
    focus: string
    replacementFilePath?: string
  }) => void
}

function EditVersionModal({ baseVersion, suggestedVersion, onClose, onSubmit }: EditVersionModalProps) {
  const [version, setVersion] = useState(suggestedVersion)
  const [changes, setChanges] = useState('')
  const [focus, setFocus] = useState('')
  const [replacementFile, setReplacementFile] = useState<string | null>(null)
  const [replacementFileName, setReplacementFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setReplacementFile(files[0].path)
      setReplacementFileName(files[0].name)
    }
  }

  const handleSelectFile = async () => {
    try {
      const filePath = await window.electronAPI.selectFile()
      if (filePath) {
        setReplacementFile(filePath)
        const name = filePath.split(/[/\\]/).pop() || ''
        setReplacementFileName(name)
      }
    } catch (error) {
      console.error('Failed to select file:', error)
    }
  }

  const handleRemoveReplacement = () => {
    setReplacementFile(null)
    setReplacementFileName(null)
  }

  const handleSubmit = () => {
    if (!version || !changes || !focus) {
      alert('请填写所有必填项')
      return
    }
    onSubmit({
      version,
      changes,
      focus,
      replacementFilePath: replacementFile || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[680px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">基于 {baseVersion.version} 修改</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* File Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-base border-2 border-dashed p-4 flex flex-col items-center gap-2 transition-colors ${
            isDragging ? 'border-primary bg-accent' : 'border-border'
          }`}
        >
          {replacementFileName ? (
            <div className="text-center">
              <p className="text-text font-bold text-sm">替换文件：{replacementFileName}</p>
              <button
                onClick={handleRemoveReplacement}
                className="text-muted text-xs hover:text-danger mt-1"
              >
                恢复为原文件
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-text font-bold text-sm">
                已从 {baseVersion.version} 复制：{baseVersion.fileName}
              </p>
              <p className="text-muted text-xs mt-1">
                确认后将打开此文件进行编辑，或拖拽新文件替换
              </p>
              <button
                onClick={handleSelectFile}
                className="mt-2 px-4 h-8 rounded-base border border-border text-text font-bold text-xs hover:bg-gray-50"
              >
                替换文件
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          {/* Version */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">版本号</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="例如：v1.1"
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Changes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">修改内容</label>
            <textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="本次修改了哪些内容？"
              rows={3}
              className="rounded-base border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Focus */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">当前重点</label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="当前写作的重点是什么？"
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-22 h-10 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="h-10 px-5 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90"
          >
            开始编辑
          </button>
        </div>

        {/* Hint */}
        <p className="text-muted text-xs">文件将用系统默认程序打开，编辑完成后自动保存为新版本。</p>
      </div>
    </div>
  )
}

export default EditVersionModal
```

**Step 2: Commit**

```bash
git add src/renderer/components/EditVersionModal.tsx
git commit -m "feat: add EditVersionModal component"
```

---

### Task 9: VersionDetailModal — 添加「基于此版本修改」按钮

**Files:**
- Modify: `src/renderer/components/VersionDetailModal.tsx:107-137`

**Step 1: Add the new button and prop**

Add `onEditFromVersion` prop to the interface:

```tsx
interface VersionDetailModalProps {
  version: Version
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Version>) => void
  onDelete: (id: string) => void
  onOpenFile: (filePath: string) => void
  onEditFromVersion?: (version: Version) => void
  editDisabled?: boolean
}
```

Update the function signature to destructure the new props.

In the Actions section (line 107–137), add the new button in the non-editing state, between「编辑」and「删除」:

```tsx
{!isEditing && (
  <>
    <button
      onClick={() => onEditFromVersion?.(version)}
      disabled={editDisabled}
      className="h-10 px-4 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90 disabled:opacity-50"
    >
      基于此版本修改
    </button>
    <button
      onClick={() => setIsEditing(true)}
      className="w-22 h-10 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
    >
      编辑
    </button>
    <button
      onClick={handleDelete}
      className="w-22 h-10 rounded-base bg-danger text-white font-bold text-sm flex items-center justify-center hover:opacity-90"
    >
      删除
    </button>
  </>
)}
```

**Step 2: Commit**

```bash
git add src/renderer/components/VersionDetailModal.tsx
git commit -m "feat: add 'edit from version' button to VersionDetailModal"
```

---

### Task 10: Timeline — 集成 EditSessionBar

**Files:**
- Modify: `src/renderer/components/Timeline.tsx`

**Step 1: Add EditSessionBar props and rendering**

Add imports and new props:

```tsx
import EditSessionBar from './EditSessionBar'

interface TimelineProps {
  versions: Version[]
  thesisTitle?: string
  onVersionClick: (version: Version) => void
  onOpenFile: (filePath: string) => void
  editSession?: {
    baseVersion: string
    newVersion: string
    autoArchive: boolean
  } | null
  onCancelEdit?: () => void
  onFinishEdit?: () => void
}
```

In both the empty-state and versions-present branches of the JSX, insert the EditSessionBar right after the header `<div>`:

```tsx
{editSession && (
  <EditSessionBar
    baseVersion={editSession.baseVersion}
    newVersion={editSession.newVersion}
    autoArchive={editSession.autoArchive}
    onCancel={onCancelEdit || (() => {})}
    onFinish={onFinishEdit || (() => {})}
  />
)}
```

**Step 2: Commit**

```bash
git add src/renderer/components/Timeline.tsx
git commit -m "feat: integrate EditSessionBar into Timeline"
```

---

### Task 11: App.tsx — 完整集成

**Files:**
- Modify: `src/renderer/App.tsx`

This is the main wiring task. All the pieces come together here.

**Step 1: Add imports**

Add to the imports at the top of `App.tsx`:

```tsx
import EditVersionModal from './components/EditVersionModal'
import { EditSession } from './types'
```

**Step 2: Add state variables**

After the existing state declarations (around line 29):

```tsx
const [editSession, setEditSession] = useState<EditSession | null>(null)
const [showEditModal, setShowEditModal] = useState(false)
const [editBaseVersion, setEditBaseVersion] = useState<Version | null>(null)
const [toast, setToast] = useState<string | null>(null)
```

**Step 3: Add useEffect for edit-session-finished listener**

After the existing useEffect blocks:

```tsx
// Listen for auto-archive completion from main process
useEffect(() => {
  const handler = (_event: any, session: EditSession) => {
    setEditSession(null)
    if (currentThesisId) {
      loadVersions(currentThesisId)
    }
    setToast(`${session.versionInfo.version} 已自动保存`)
    setTimeout(() => setToast(null), 3000)
  }
  window.electronAPI.onEditSessionFinished(handler)

  return () => {
    window.electronAPI.removeEditSessionListener()
  }
}, [currentThesisId])

// Check for pending edit session on mount
useEffect(() => {
  const checkPending = async () => {
    try {
      const pending = await window.electronAPI.getPendingEditSession()
      if (pending) {
        const keep = confirm(`上次编辑 ${pending.versionInfo.version} 未完成，是否保留为新版本？`)
        await window.electronAPI.resolvePendingEditSession(keep)
        if (keep && currentThesisId) {
          await loadVersions(currentThesisId)
        }
      }
    } catch (e) {
      console.error('Failed to check pending session:', e)
    }
  }
  checkPending()
}, [])
```

**Step 4: Add handler functions**

```tsx
const handleEditFromVersion = (version: Version) => {
  setEditBaseVersion(version)
  setSelectedVersion(null) // close detail modal
  setShowEditModal(true)
}

const handleStartEditSession = async (versionInfo: {
  version: string
  changes: string
  focus: string
  replacementFilePath?: string
}) => {
  if (!editBaseVersion || !currentThesisId) return
  try {
    const session = await window.electronAPI.startEditSession({
      baseVersionId: editBaseVersion.id,
      thesisId: currentThesisId,
      baseFilePath: editBaseVersion.filePath,
      baseFileName: editBaseVersion.fileName,
      baseFileType: editBaseVersion.fileType,
      versionInfo: {
        version: versionInfo.version,
        changes: versionInfo.changes,
        focus: versionInfo.focus,
      },
      replacementFilePath: versionInfo.replacementFilePath,
    })
    setEditSession(session)
    setShowEditModal(false)
    setEditBaseVersion(null)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '启动编辑失败'
    alert(msg)
  }
}

const handleCancelEdit = async () => {
  if (!confirm('确定要取消编辑吗？未保存的修改将丢失。')) return
  try {
    await window.electronAPI.cancelEditSession()
    setEditSession(null)
  } catch (error) {
    console.error('Failed to cancel edit:', error)
  }
}

const handleFinishEdit = async () => {
  try {
    await window.electronAPI.finishEditSession()
    setEditSession(null)
    if (currentThesisId) {
      await loadVersions(currentThesisId)
    }
    setToast(`${editSession?.versionInfo.version} 已保存`)
    setTimeout(() => setToast(null), 3000)
  } catch (error) {
    console.error('Failed to finish edit:', error)
  }
}
```

**Step 5: Import incrementVersion and use it**

Since `incrementVersion` is in `src/main/version-utils.ts` (main process), we need to duplicate the simple logic in the renderer or just inline it. The simplest approach: add a tiny utility in the renderer.

Create a one-liner helper at the top of `App.tsx` (below imports):

```tsx
function incrementVersion(version: string): string {
  const match = version.match(/^(.*?)(\d+)(\D*)$/)
  if (!match) return version
  const [, prefix, num, suffix] = match
  return `${prefix}${parseInt(num, 10) + 1}${suffix}`
}
```

**Step 6: Update JSX**

Update `Sidebar` props — disable upload and thesis switching during edit:

```tsx
<Sidebar
  theses={theses}
  currentThesisId={currentThesisId}
  currentThesis={currentThesis}
  onSelectThesis={editSession ? () => {} : handleSelectThesis}
  onCreateThesis={handleCreateThesis}
  onDeleteThesis={handleDeleteThesis}
  onUpdateThesis={handleUpdateThesis}
  versionCount={versions.length}
  latestVersion={versions.length > 0 ? versions[0].date : ''}
  onUploadClick={() => setShowUploadModal(true)}
  dataDir={dataDirStatus?.effectivePath || ''}
  onSettingsClick={() => setShowSettingsModal(true)}
  uploadDisabled={!!editSession}
/>
```

Note: `Sidebar` needs a new `uploadDisabled` prop — we'll handle that in Step 7 below.

Update `Timeline` props:

```tsx
<Timeline
  versions={versions}
  thesisTitle={currentThesis?.title || ''}
  onVersionClick={setSelectedVersion}
  onOpenFile={handleOpenFile}
  editSession={editSession ? {
    baseVersion: editSession.versionInfo.version,
    newVersion: editSession.versionInfo.version,
    autoArchive: editSession.autoArchive,
  } : null}
  onCancelEdit={handleCancelEdit}
  onFinishEdit={handleFinishEdit}
/>
```

Wait — `baseVersion` should show the base version string. We need to find it from the versions array. Fix:

```tsx
editSession={editSession ? {
  baseVersion: versions.find(v => v.id === editSession.baseVersionId)?.version || '?',
  newVersion: editSession.versionInfo.version,
  autoArchive: editSession.autoArchive,
} : null}
```

Update `VersionDetailModal` to pass the new prop:

```tsx
{selectedVersion && (
  <VersionDetailModal
    version={selectedVersion}
    onClose={() => setSelectedVersion(null)}
    onUpdate={handleUpdateVersion}
    onDelete={handleDeleteVersion}
    onOpenFile={handleOpenFile}
    onEditFromVersion={handleEditFromVersion}
    editDisabled={!!editSession}
  />
)}
```

Add `EditVersionModal`:

```tsx
{showEditModal && editBaseVersion && (
  <EditVersionModal
    baseVersion={editBaseVersion}
    suggestedVersion={incrementVersion(editBaseVersion.version)}
    onClose={() => {
      setShowEditModal(false)
      setEditBaseVersion(null)
    }}
    onSubmit={handleStartEditSession}
  />
)}
```

Add toast at the bottom of the JSX (before closing `</div>`):

```tsx
{toast && (
  <div className="fixed bottom-6 right-6 bg-primary text-white px-4 py-2 rounded-base shadow-card text-sm font-bold z-50">
    {toast}
  </div>
)}
```

**Step 7: Update Sidebar to accept uploadDisabled**

In `src/renderer/components/Sidebar.tsx`, add `uploadDisabled?: boolean` to the `SidebarProps` interface, and apply it to the upload button:

```tsx
disabled={!currentThesisId || uploadDisabled}
```

**Step 8: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/Sidebar.tsx
git commit -m "feat: wire up edit-from-version flow in App.tsx"
```

---

### Task 12: 更新 renderer types.ts — ElectronAPI 补全

**Files:**
- Modify: `src/renderer/types.ts`

**Step 1: Add all missing API methods**

Ensure the `ElectronAPI` interface includes:

```ts
  // 编辑会话
  startEditSession: (params: {
    baseVersionId: string
    thesisId: string
    baseFilePath: string
    baseFileName: string
    baseFileType: string
    versionInfo: { version: string; changes: string; focus: string }
    replacementFilePath?: string
  }) => Promise<EditSession>
  cancelEditSession: () => Promise<boolean>
  finishEditSession: () => Promise<boolean>
  onEditSessionFinished: (callback: (event: any, session: EditSession) => void) => void
  removeEditSessionListener: () => void
  onEditSessionWatchError: (callback: () => void) => void
  getPendingEditSession: () => Promise<EditSession | null>
  resolvePendingEditSession: (keep: boolean) => Promise<boolean>
```

**Step 2: Commit**

```bash
git add src/renderer/types.ts
git commit -m "feat: add edit session types to ElectronAPI interface"
```

---

### Task 13: 集成测试 — 全流程 Contract 检查

**Files:**
- Create: `tests/main/edit-from-version-contract.test.ts`

**Step 1: Write the contract tests**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('edit-from-version full contract', () => {
  it('VersionDetailModal has onEditFromVersion prop', () => {
    const source = fs.readFileSync('src/renderer/components/VersionDetailModal.tsx', 'utf8')
    expect(source).toContain('onEditFromVersion')
    expect(source).toContain('基于此版本修改')
  })

  it('EditVersionModal exists and has key elements', () => {
    const source = fs.readFileSync('src/renderer/components/EditVersionModal.tsx', 'utf8')
    expect(source).toContain('开始编辑')
    expect(source).toContain('baseVersion')
    expect(source).toContain('suggestedVersion')
  })

  it('EditSessionBar exists and has key elements', () => {
    const source = fs.readFileSync('src/renderer/components/EditSessionBar.tsx', 'utf8')
    expect(source).toContain('正在编辑')
    expect(source).toContain('完成修改')
    expect(source).toContain('取消编辑')
  })

  it('App.tsx integrates edit session flow', () => {
    const source = fs.readFileSync('src/renderer/App.tsx', 'utf8')
    expect(source).toContain('editSession')
    expect(source).toContain('EditVersionModal')
    expect(source).toContain('handleEditFromVersion')
    expect(source).toContain('handleStartEditSession')
    expect(source).toContain('handleCancelEdit')
    expect(source).toContain('handleFinishEdit')
    expect(source).toContain('onEditSessionFinished')
  })

  it('Timeline accepts editSession prop', () => {
    const source = fs.readFileSync('src/renderer/components/Timeline.tsx', 'utf8')
    expect(source).toContain('editSession')
    expect(source).toContain('EditSessionBar')
  })

  it('Sidebar accepts uploadDisabled prop', () => {
    const source = fs.readFileSync('src/renderer/components/Sidebar.tsx', 'utf8')
    expect(source).toContain('uploadDisabled')
  })

  it('edit-session module exports required functions', () => {
    const source = fs.readFileSync('src/main/edit-session.ts', 'utf8')
    expect(source).toContain('export function createEditSession')
    expect(source).toContain('export function archiveSession')
    expect(source).toContain('export function clearSession')
    expect(source).toContain('export function startLockFileWatch')
    expect(source).toContain('export function loadPersistedSession')
  })
})
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add tests/main/edit-from-version-contract.test.ts
git commit -m "test: add full contract tests for edit-from-version feature"
```

---

### Task 14: 手动验收测试

**No code changes.** Run the app and verify:

**Step 1: Start dev mode**

Run: `npm run dev`

**Step 2: Test happy path (docx auto-archive)**

1. Create a thesis, upload a `.docx` version as v1.0
2. Click version card → version detail modal opens
3. Click「基于此版本修改」→ EditVersionModal opens with version pre-filled as v1.1
4. Fill in changes and focus, click「开始编辑」
5. Word/WPS opens the file, EditSessionBar appears
6. Edit and save in Word, then close Word
7. Verify: new version v1.1 appears in timeline, toast shows

**Step 3: Test manual archive (txt)**

1. Upload a `.txt` version
2. Repeat steps 2-5 above
3. EditSessionBar should show「完成修改」button
4. Edit in Notepad, save, close
5. Click「完成修改」in the app
6. Verify: new version appears

**Step 4: Test cancel**

1. Start an edit session
2. Click「取消编辑」in the EditSessionBar
3. Verify: session cleared, no new version created

**Step 5: Test crash recovery**

1. Start an edit session
2. Kill the app (close terminal)
3. Restart the app
4. Verify: prompt appears asking whether to keep the unfinished version

**Step 6: Commit final**

```bash
git add -A
git commit -m "feat: edit-from-version complete"
```

---

Plan complete and saved to `docs/plans/2026-02-17-edit-from-version-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?
