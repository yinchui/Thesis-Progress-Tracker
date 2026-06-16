# Reference Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a per-thesis collapsible reference section that stores title, authors, and year, and supports adding and deleting references without showing them in the main timeline.

**Architecture:** References live in a `references.json` file inside each thesis directory, parallel to `versions.json`. The Electron main process owns file access and exposes `getReferences`, `addReference`, and `deleteReference` through preload. React keeps the reference list in `App.tsx`, renders a compact `ReferenceSection` inside `Timeline`, and opens a small `ReferenceModal` for new entries.

**Tech Stack:** Electron 28 IPC, Node `fs` JSON storage, React 18 state, TypeScript 5, Tailwind CSS classes, Vitest 2 contract and unit tests.

---

Skill refs for execution: `@test-driven-development`, `@systematic-debugging`, `@verification-before-completion`.

Run all commands from `Thesis-Progress-Tracker/` unless a step explicitly says otherwise.

Design source: `docs/plans/2026-06-16-reference-section-design.md`.

Important workspace note: the current repository may contain unrelated mobile-directory changes. During execution, stage and commit only the files listed in each task.

### Task 1: Add Reference Storage Helpers

**Files:**
- Modify: `src/main/split-data-store.ts`
- Modify: `tests/main/split-data-store.test.ts`

**Step 1: Write the failing tests**

Update the import block in `tests/main/split-data-store.test.ts` to include the new helpers:

```ts
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
```

Append this describe block after the existing `thesis-versions` tests:

```ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/split-data-store.test.ts`

Expected: FAIL because `loadThesisReferences` and `saveThesisReferences` are not exported yet.

**Step 3: Write minimal implementation**

In `src/main/split-data-store.ts`, add these types near the existing `VersionRecord` and `ThesisVersions` types:

```ts
export interface ReferenceRecord {
  id: string
  thesisId: string
  title: string
  authors: string
  year: string
  createdAt: string
}

export interface ThesisReferences {
  references: ReferenceRecord[]
}
```

Add the new storage helpers after the thesis-version helpers:

```ts
// ==================== Thesis References ====================

const REFERENCES_FILE = 'references.json'

export function loadThesisReferences(dataDir: string, thesisTitle: string): ThesisReferences {
  const dir = getThesisDir(dataDir, thesisTitle)
  return readJsonSafe(path.join(dir, REFERENCES_FILE), { references: [] })
}

export function saveThesisReferences(dataDir: string, thesisTitle: string, data: ThesisReferences): void {
  const dir = getThesisDir(dataDir, thesisTitle)
  writeJson(path.join(dir, REFERENCES_FILE), data)
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/split-data-store.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/split-data-store.ts tests/main/split-data-store.test.ts
git commit -m "feat: add thesis reference storage helpers"
```

### Task 2: Add Main-Process Reference IPC Handlers

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Create: `tests/main/reference-ipc-contract.test.ts`

**Step 1: Write the failing contract test**

Create `tests/main/reference-ipc-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('reference IPC contract', () => {
  const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')

  it('registers reference handlers', () => {
    expect(source).toContain("'get-references'")
    expect(source).toContain("'add-reference'")
    expect(source).toContain("'delete-reference'")
  })

  it('uses split-data-store reference helpers', () => {
    expect(source).toContain('loadThesisReferences')
    expect(source).toContain('saveThesisReferences')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/reference-ipc-contract.test.ts`

Expected: FAIL because the handler strings and imports do not exist yet.

**Step 3: Import reference helpers**

In `src/main/ipc-handlers.ts`, extend the existing import from `./split-data-store`:

```ts
  loadThesisReferences,
  saveThesisReferences,
  ReferenceRecord,
```

**Step 4: Add small reference input helpers**

Add these helpers near the existing utility functions in `src/main/ipc-handlers.ts`:

```ts
interface ReferenceInput {
  title?: string
  authors?: string
  year?: string
}

function normalizeReferenceInput(input: ReferenceInput): { title: string; authors: string; year: string } {
  const title = input.title?.trim() || ''
  const authors = input.authors?.trim() || ''
  const year = input.year?.trim() || ''

  if (!title || !authors || !year) {
    throw new Error('参考文献标题、作者、年份不能为空')
  }

  return { title, authors, year }
}

function touchThesisUpdatedAt(index: { theses: Thesis[] }, thesisId: string): void {
  const thesisIdx = index.theses.findIndex(t => t.id === thesisId)
  if (thesisIdx !== -1) {
    index.theses[thesisIdx].updatedAt = new Date().toISOString()
  }
}
```

**Step 5: Add IPC handlers**

Add this section after `get-current-thesis` and before the version IPC handlers:

```ts
// ==================== Reference IPC Handlers ====================

ipcMain.handle('get-references', async (_event, thesisId: string) => {
  log.info('IPC: get-references', thesisId);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const thesis = index.theses.find(t => t.id === thesisId);
  if (!thesis) return [];

  const data = loadThesisReferences(dataDir, thesis.title);
  return data.references;
});

ipcMain.handle('add-reference', async (_event, thesisId: string, input: ReferenceInput) => {
  log.info('IPC: add-reference', thesisId, input);
  const normalized = normalizeReferenceInput(input);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const thesis = index.theses.find(t => t.id === thesisId);
  if (!thesis) throw new Error('未找到对应论文');

  const data = loadThesisReferences(dataDir, thesis.title);
  const newReference: ReferenceRecord = {
    id: generateId(),
    thesisId,
    title: normalized.title,
    authors: normalized.authors,
    year: normalized.year,
    createdAt: new Date().toISOString(),
  };

  data.references.push(newReference);
  saveThesisReferences(dataDir, thesis.title, data);
  touchThesisUpdatedAt(index, thesisId);
  saveThesesIndex(dataDir, index);
  silenceWatcher();
  return newReference;
});

ipcMain.handle('delete-reference', async (_event, thesisId: string, referenceId: string) => {
  log.info('IPC: delete-reference', thesisId, referenceId);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const thesis = index.theses.find(t => t.id === thesisId);
  if (!thesis) return false;

  const data = loadThesisReferences(dataDir, thesis.title);
  const before = data.references.length;
  data.references = data.references.filter(reference => reference.id !== referenceId);
  if (data.references.length === before) return false;

  saveThesisReferences(dataDir, thesis.title, data);
  touchThesisUpdatedAt(index, thesisId);
  saveThesesIndex(dataDir, index);
  silenceWatcher();
  return true;
});
```

**Step 6: Run test to verify it passes**

Run: `npm run test -- tests/main/reference-ipc-contract.test.ts`

Expected: PASS.

**Step 7: Run TypeScript build**

Run: `npm run build:electron`

Expected: PASS.

**Step 8: Commit**

```bash
git add src/main/ipc-handlers.ts tests/main/reference-ipc-contract.test.ts
git commit -m "feat: add reference ipc handlers"
```

### Task 3: Expose Reference APIs Through Preload and Renderer Types

**Files:**
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `tests/release/preload-api-contract.test.ts`

**Step 1: Write the failing contract test**

Append this test to `tests/release/preload-api-contract.test.ts`:

```ts
  it('includes reference management methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('getReferences')
    expect(source).toContain('addReference')
    expect(source).toContain('deleteReference')
    expect(source).toContain('get-references')
    expect(source).toContain('add-reference')
    expect(source).toContain('delete-reference')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/preload-api-contract.test.ts`

Expected: FAIL because preload does not expose the methods yet.

**Step 3: Add preload types and methods**

In `src/preload/preload.ts`, add this interface after `Version`:

```ts
export interface ReferenceRecord {
  id: string;
  thesisId: string;
  title: string;
  authors: string;
  year: string;
  createdAt: string;
}
```

Add these methods inside `electronAPI`, near the thesis/version methods:

```ts
  // Reference management
  getReferences: (thesisId: string): Promise<ReferenceRecord[]> =>
    ipcRenderer.invoke('get-references', thesisId),
  addReference: (
    thesisId: string,
    input: { title: string; authors: string; year: string }
  ): Promise<ReferenceRecord> => ipcRenderer.invoke('add-reference', thesisId, input),
  deleteReference: (thesisId: string, referenceId: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-reference', thesisId, referenceId),
```

**Step 4: Add renderer types**

In `src/renderer/types.ts`, add this interface after `Version`:

```ts
export interface ReferenceRecord {
  id: string
  thesisId: string
  title: string
  authors: string
  year: string
  createdAt: string
}
```

Add these methods to the `ElectronAPI` interface:

```ts
  // 参考文献相关
  getReferences: (thesisId: string) => Promise<ReferenceRecord[]>
  addReference: (
    thesisId: string,
    input: { title: string; authors: string; year: string }
  ) => Promise<ReferenceRecord>
  deleteReference: (thesisId: string, referenceId: string) => Promise<boolean>
```

**Step 5: Run tests and build**

Run:

1. `npm run test -- tests/release/preload-api-contract.test.ts`
2. `npm run build:renderer`

Expected:

1. PASS.
2. PASS.

**Step 6: Commit**

```bash
git add src/preload/preload.ts src/renderer/types.ts tests/release/preload-api-contract.test.ts
git commit -m "feat: expose reference preload api"
```

### Task 4: Build Add Reference Modal

**Files:**
- Create: `src/renderer/components/ReferenceModal.tsx`
- Create: `tests/release/reference-ui-contract.test.ts`

**Step 1: Write the failing UI contract test**

Create `tests/release/reference-ui-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('reference UI contract', () => {
  it('provides an add-reference modal with required fields', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceModal.tsx', 'utf8')
    expect(source).toContain('新增参考文献')
    expect(source).toContain('标题')
    expect(source).toContain('作者')
    expect(source).toContain('年份')
    expect(source).toContain('onSubmit')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: FAIL because `ReferenceModal.tsx` does not exist yet.

**Step 3: Create the modal**

Create `src/renderer/components/ReferenceModal.tsx`:

```tsx
import { useState } from 'react'

interface ReferenceInput {
  title: string
  authors: string
  year: string
}

interface ReferenceModalProps {
  onClose: () => void
  onSubmit: (input: ReferenceInput) => void | Promise<void>
}

function ReferenceModal({ onClose, onSubmit }: ReferenceModalProps) {
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [year, setYear] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const input = {
      title: title.trim(),
      authors: authors.trim(),
      year: year.trim(),
    }

    if (!input.title || !input.authors || !input.year) {
      setError('请填写标题、作者和年份')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="w-[520px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">新增参考文献</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-text">
          标题
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-base border border-border px-3 text-sm font-normal focus:outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-text">
          作者
          <input
            value={authors}
            onChange={(event) => setAuthors(event.target.value)}
            className="h-10 rounded-base border border-border px-3 text-sm font-normal focus:outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-text">
          年份
          <input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="h-10 rounded-base border border-border px-3 text-sm font-normal focus:outline-none focus:border-primary"
          />
        </label>

        {error && <p className="text-danger text-xs">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReferenceModal
```

**Step 4: Run test and renderer build**

Run:

1. `npm run test -- tests/release/reference-ui-contract.test.ts`
2. `npm run build:renderer`

Expected:

1. PASS.
2. PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/ReferenceModal.tsx tests/release/reference-ui-contract.test.ts
git commit -m "feat: add reference modal"
```

### Task 5: Build Collapsible Reference Section

**Files:**
- Create: `src/renderer/components/ReferenceSection.tsx`
- Modify: `tests/release/reference-ui-contract.test.ts`

**Step 1: Extend the failing UI contract test**

Append this test to `tests/release/reference-ui-contract.test.ts`:

```ts
  it('provides a collapsible reference section', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceSection.tsx', 'utf8')
    expect(source).toContain('ReferenceModal')
    expect(source).toContain('参考文献')
    expect(source).toContain('暂无参考文献')
    expect(source).toContain('新增参考文献')
    expect(source).toContain('confirm')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: FAIL because `ReferenceSection.tsx` does not exist yet.

**Step 3: Create the section**

Create `src/renderer/components/ReferenceSection.tsx`:

```tsx
import { useState } from 'react'
import { ReferenceRecord } from '../types'
import ReferenceModal from './ReferenceModal'

interface ReferenceInput {
  title: string
  authors: string
  year: string
}

interface ReferenceSectionProps {
  references: ReferenceRecord[]
  onAddReference: (input: ReferenceInput) => void | Promise<void>
  onDeleteReference: (referenceId: string) => void | Promise<void>
}

function ReferenceSection({ references, onAddReference, onDeleteReference }: ReferenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleAddReference = async (input: ReferenceInput) => {
    await onAddReference(input)
    setShowModal(false)
    setIsExpanded(true)
  }

  const handleDeleteReference = async (referenceId: string) => {
    if (!confirm('确定要删除这条参考文献吗？')) return
    await onDeleteReference(referenceId)
  }

  return (
    <section className="rounded-base border border-border bg-card">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full h-11 px-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-text font-bold text-sm">参考文献 {references.length}</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-border p-3 flex flex-col gap-3">
          {references.length === 0 ? (
            <div className="rounded-base bg-accent p-3 flex items-center justify-between gap-3">
              <span className="text-muted text-sm">暂无参考文献</span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="h-8 px-3 rounded-base bg-primary text-white font-bold text-xs hover:opacity-90"
              >
                新增参考文献
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {references.map(reference => (
                  <div
                    key={reference.id}
                    className="rounded-base border border-border px-3 py-2 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex flex-col gap-1">
                      <span className="text-text text-sm font-bold truncate">{reference.title}</span>
                      <span className="text-muted text-xs truncate">
                        {reference.authors} · {reference.year}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteReference(reference.id)}
                      className="shrink-0 text-danger text-xs font-bold hover:underline"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="h-8 px-3 rounded-base border border-border text-text font-bold text-xs hover:bg-gray-50"
                >
                  新增参考文献
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <ReferenceModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddReference}
        />
      )}
    </section>
  )
}

export default ReferenceSection
```

**Step 4: Run test and renderer build**

Run:

1. `npm run test -- tests/release/reference-ui-contract.test.ts`
2. `npm run build:renderer`

Expected:

1. PASS.
2. PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/ReferenceSection.tsx tests/release/reference-ui-contract.test.ts
git commit -m "feat: add collapsible reference section"
```

### Task 6: Integrate References Into App and Timeline

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Timeline.tsx`
- Modify: `tests/release/reference-ui-contract.test.ts`

**Step 1: Extend the failing integration contract test**

Append these tests to `tests/release/reference-ui-contract.test.ts`:

```ts
  it('Timeline integrates ReferenceSection', () => {
    const source = fs.readFileSync('src/renderer/components/Timeline.tsx', 'utf8')
    expect(source).toContain('ReferenceSection')
    expect(source).toContain('references')
    expect(source).toContain('onAddReference')
    expect(source).toContain('onDeleteReference')
  })

  it('App manages reference state and handlers', () => {
    const source = fs.readFileSync('src/renderer/App.tsx', 'utf8')
    expect(source).toContain('references')
    expect(source).toContain('loadReferences')
    expect(source).toContain('handleAddReference')
    expect(source).toContain('handleDeleteReference')
    expect(source).toContain('getReferences')
    expect(source).toContain('addReference')
    expect(source).toContain('deleteReference')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: FAIL because `Timeline` and `App` do not integrate references yet.

**Step 3: Update Timeline props and rendering**

In `src/renderer/components/Timeline.tsx`, import the new component and type:

```ts
import { ReferenceRecord } from '../types'
import ReferenceSection from './ReferenceSection'
```

Add a local input type:

```ts
interface ReferenceInput {
  title: string
  authors: string
  year: string
}
```

Extend `TimelineProps`:

```ts
  references?: ReferenceRecord[]
  onAddReference?: (input: ReferenceInput) => void | Promise<void>
  onDeleteReference?: (referenceId: string) => void | Promise<void>
```

Destructure the props with defaults:

```ts
  references = [],
  onAddReference,
  onDeleteReference,
```

Add this block after `EditSessionBar` in both the empty-state branch and the normal timeline branch:

```tsx
        {onAddReference && onDeleteReference && (
          <ReferenceSection
            references={references}
            onAddReference={onAddReference}
            onDeleteReference={onDeleteReference}
          />
        )}
```

Keep the empty version state below the reference block so references can still be managed before the first version is uploaded.

**Step 4: Update App state and loaders**

In `src/renderer/App.tsx`, import `ReferenceRecord`:

```ts
import { DataDirStatus, EditSession, ReferenceRecord } from './types'
```

Add state near `versions`:

```ts
const [references, setReferences] = useState<ReferenceRecord[]>([])
```

Replace the existing current-thesis effect with:

```ts
  useEffect(() => {
    if (currentThesisId) {
      void loadVersions(currentThesisId)
      void loadReferences(currentThesisId)
    } else {
      setVersions([])
      setReferences([])
    }
  }, [currentThesisId])
```

Add the loader after `loadVersions`:

```ts
  const loadReferences = async (thesisId: string) => {
    try {
      const data = await window.electronAPI.getReferences(thesisId)
      setReferences(data)
    } catch (error) {
      console.error('Failed to load references:', error)
      setReferences([])
    }
  }
```

Update `handleSelectThesis` to avoid duplicate loading. Let the effect load versions and references:

```ts
  const handleSelectThesis = async (id: string) => {
    try {
      await window.electronAPI.setCurrentThesis(id)
      setCurrentThesisId(id)
    } catch (error) {
      console.error('Failed to select thesis:', error)
    }
  }
```

When creating a thesis, clear references with versions:

```ts
        setVersions([])
        setReferences([])
```

When deleting the current thesis and no theses remain, clear references too:

```ts
          setReferences([])
```

Add handlers near the version handlers:

```ts
  const handleAddReference = async (input: { title: string; authors: string; year: string }) => {
    if (!currentThesisId) return
    try {
      await window.electronAPI.addReference(currentThesisId, input)
      await loadReferences(currentThesisId)
      setToast('参考文献已添加')
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to add reference:', error)
      alert('新增参考文献失败')
    }
  }

  const handleDeleteReference = async (referenceId: string) => {
    if (!currentThesisId) return
    try {
      await window.electronAPI.deleteReference(currentThesisId, referenceId)
      await loadReferences(currentThesisId)
      setToast('参考文献已删除')
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to delete reference:', error)
      alert('删除参考文献失败')
    }
  }
```

Pass references into `Timeline`:

```tsx
      <Timeline
        versions={versions}
        thesisTitle={currentThesis?.title || ''}
        references={references}
        onAddReference={handleAddReference}
        onDeleteReference={handleDeleteReference}
        onVersionClick={setSelectedVersion}
        onOpenFile={handleOpenFile}
        editSession={editSession ? {
          baseVersion: versions.find(v => v.id === editSession.baseVersionId)?.version || '?',
          newVersion: editSession.versionInfo.version,
          autoArchive: editSession.autoArchive,
        } : null}
        onCancelEdit={handleCancelEdit}
        onFinishEdit={handleFinishEdit}
      />
```

**Step 5: Run integration contract and renderer build**

Run:

1. `npm run test -- tests/release/reference-ui-contract.test.ts`
2. `npm run build:renderer`

Expected:

1. PASS.
2. PASS.

**Step 6: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/Timeline.tsx tests/release/reference-ui-contract.test.ts
git commit -m "feat: integrate references into timeline"
```

### Task 7: Verify Full Feature

**Files:**
- No new files expected.

**Step 1: Run targeted tests**

Run:

```bash
npm run test -- tests/main/split-data-store.test.ts tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts tests/release/reference-ui-contract.test.ts
```

Expected: PASS.

**Step 2: Run the full test suite**

Run: `npm run test`

Expected: PASS.

**Step 3: Run full build**

Run: `npm run build`

Expected: PASS.

**Step 4: Manual desktop smoke test**

Run: `npm run dev`

Expected:

- The app opens normally.
- Current thesis page shows a collapsed `参考文献 0` or `参考文献 n` row.
- Expanding the row does not disturb the timeline layout.
- Adding a reference with title, authors, and year creates an entry.
- The entry is not shown in the version timeline cards.
- Deleting the entry removes it after confirmation.
- Switching to another thesis shows only that thesis's references.
- Existing upload, open file, version detail, and edit-from-version flows still work.

Stop the dev server after the smoke test before ending execution.

**Step 5: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only the reference feature files from Tasks 1-6 are changed, plus any unrelated pre-existing workspace changes remain untouched and unstaged.

**Step 6: Final commit if needed**

If any verification-only fix was required after Task 6, commit it:

```bash
git add <only-reference-feature-files>
git commit -m "fix: polish reference section integration"
```

If no fixes were required, do not create an empty commit.
