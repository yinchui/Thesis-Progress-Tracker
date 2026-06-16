# Reference File AI Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual-only reference entry with per-thesis PDF/DOCX/DOC upload, local text extraction, DeepSeek-based recognition, editable confirmation, and synced original reference files.

**Architecture:** Reference files are copied into each thesis directory under `references/`, and `references.json` is extended to store both `referenceFiles` metadata and recognized `references`. The main process owns file I/O, local DeepSeek API key storage, text extraction, DeepSeek calls, and persistence. The renderer consumes a full reference-data API, exposes an upload/recognize flow in `ReferenceSection`, then shows an editable confirmation modal before saving recognized entries.

**Tech Stack:** Electron 28 IPC, Node `fs/path/crypto`, React 18 + TypeScript, Vitest 2, DeepSeek OpenAI-compatible chat completions via `fetch`, PDF/DOCX/DOC text extraction using maintained Node packages. `.doc` support is best-effort: try real extraction first, and if it fails tell the user to save as `.docx`.

---

Skill refs for execution: `@test-driven-development`, `@systematic-debugging`, `@verification-before-completion`.

Run all commands from `Thesis-Progress-Tracker/` unless a step explicitly says otherwise.

Design source: `docs/plans/2026-06-16-reference-file-ai-import-design.md`.

Important workspace note: the current repository may contain unrelated mobile-directory changes. During execution, stage and commit only the files listed in each task.

Important product note: DeepSeek API key must be stored only in local app settings under Electron `userData`, never in the thesis data directory that syncs to JianGuoYun.

### Task 1: Extend Reference Storage Schema

**Files:**
- Modify: `src/main/split-data-store.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `tests/main/split-data-store.test.ts`

**Step 1: Write failing storage tests**

In `tests/main/split-data-store.test.ts`, extend the existing `thesis-references` tests with this test:

```ts
    it('round-trips reference files and source-linked references', () => {
      const data = {
        referenceFiles: [
          {
            id: 'file-1',
            thesisId: 't1',
            originalName: 'refs.pdf',
            fileName: 'reference_file-1.pdf',
            filePath: 'references/reference_file-1.pdf',
            mimeType: 'application/pdf',
            status: 'ready' as const,
            uploadedAt: '2026-06-16T00:00:00.000Z',
            recognizedAt: '2026-06-16T00:01:00.000Z',
            error: null,
          },
        ],
        references: [
          {
            id: 'r1',
            thesisId: 't1',
            sourceFileId: 'file-1',
            title: 'Reference A',
            authors: 'Author A',
            year: '2026',
            createdAt: '2026-06-16T00:01:30.000Z',
          },
        ],
      }

      saveThesisReferences(tmpDir, '论文A', data)
      const loaded = loadThesisReferences(tmpDir, '论文A')

      expect(loaded.referenceFiles).toHaveLength(1)
      expect(loaded.referenceFiles[0].status).toBe('ready')
      expect(loaded.references[0].sourceFileId).toBe('file-1')
    })
```

Add a migration compatibility test:

```ts
    it('adds an empty referenceFiles array for legacy references json', () => {
      const thesisDir = path.join(tmpDir, sanitizeFileName('旧论文'))
      fs.mkdirSync(thesisDir, { recursive: true })
      fs.writeFileSync(
        path.join(thesisDir, 'references.json'),
        JSON.stringify({ references: [] }),
        'utf8'
      )

      const loaded = loadThesisReferences(tmpDir, '旧论文')

      expect(loaded.referenceFiles).toEqual([])
      expect(loaded.references).toEqual([])
    })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/split-data-store.test.ts`

Expected: FAIL because `referenceFiles` is not part of `ThesisReferences`.

**Step 3: Extend storage types and loader**

In `src/main/split-data-store.ts`, replace the reference types with:

```ts
export type ReferenceFileStatus = 'pending' | 'recognizing' | 'ready' | 'failed'

export interface ReferenceFileRecord {
  id: string
  thesisId: string
  originalName: string
  fileName: string
  filePath: string
  mimeType: string
  status: ReferenceFileStatus
  uploadedAt: string
  recognizedAt?: string | null
  error?: string | null
}

export interface ReferenceRecord {
  id: string
  thesisId: string
  sourceFileId?: string
  title: string
  authors: string
  year: string
  createdAt: string
}

export interface ThesisReferences {
  referenceFiles: ReferenceFileRecord[]
  references: ReferenceRecord[]
}
```

Update `loadThesisReferences` to normalize legacy data:

```ts
export function loadThesisReferences(dataDir: string, thesisTitle: string): ThesisReferences {
  const dir = getThesisDir(dataDir, thesisTitle)
  const data = readJsonSafe<Partial<ThesisReferences>>(path.join(dir, REFERENCES_FILE), {
    referenceFiles: [],
    references: [],
  })

  return {
    referenceFiles: Array.isArray(data.referenceFiles) ? data.referenceFiles : [],
    references: Array.isArray(data.references) ? data.references : [],
  }
}
```

**Step 4: Mirror types in preload and renderer**

In `src/preload/preload.ts` and `src/renderer/types.ts`, add `ReferenceFileStatus`, `ReferenceFileRecord`, and optional `sourceFileId` to `ReferenceRecord`.

**Step 5: Run test to verify it passes**

Run: `npm run test -- tests/main/split-data-store.test.ts`

Expected: PASS.

**Step 6: Run focused type checks**

Run: `npm run build`

Expected: PASS.

**Step 7: Commit**

```bash
git add src/main/split-data-store.ts src/preload/preload.ts src/renderer/types.ts tests/main/split-data-store.test.ts
git commit -m "feat: extend reference storage for source files"
```

### Task 2: Add Reference File Storage IPC

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `tests/main/reference-ipc-contract.test.ts`

**Step 1: Write failing IPC contract tests**

Extend `tests/main/reference-ipc-contract.test.ts`:

```ts
  it('registers reference file handlers', () => {
    expect(source).toContain("'select-reference-file'")
    expect(source).toContain("'import-reference-file'")
    expect(source).toContain("'delete-reference-file'")
  })

  it('stores uploaded reference files under a references subdirectory', () => {
    expect(source).toContain("path.join(thesisDir, 'references')")
    expect(source).toContain('referenceFiles')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/reference-ipc-contract.test.ts`

Expected: FAIL because the new IPC handler names do not exist.

**Step 3: Add file helper types**

In `src/main/ipc-handlers.ts`, import `ReferenceFileRecord` from `./split-data-store`.

Add:

```ts
type ReferenceImportStatus = 'saved' | 'failed'

interface ImportedReferenceFileResult {
  file: ReferenceFileRecord
  extractedText?: string
  status: ReferenceImportStatus
  error?: string
}

function getMimeTypeFromExtension(ext: string): string {
  const normalized = ext.toLowerCase()
  if (normalized === '.pdf') return 'application/pdf'
  if (normalized === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (normalized === '.doc') return 'application/msword'
  return 'application/octet-stream'
}
```

**Step 4: Add reference file selector IPC**

Add near file operation handlers:

```ts
ipcMain.handle('select-reference-file', async () => {
  log.info('IPC: select-reference-file')
  const windows = BrowserWindow.getAllWindows()
  const mainWindow = windows[0]

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Reference Documents', extensions: ['pdf', 'docx', 'doc'] },
    ],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})
```

**Step 5: Add import-reference-file IPC without text extraction yet**

Add a minimal handler:

```ts
ipcMain.handle('import-reference-file', async (_event, thesisId: string, sourcePath: string): Promise<ImportedReferenceFileResult> => {
  log.info('IPC: import-reference-file', thesisId, sourcePath)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)
  const thesis = index.theses.find(t => t.id === thesisId)
  if (!thesis) throw new Error('未找到对应论文')
  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error('文件不存在')

  const ext = path.extname(sourcePath).toLowerCase()
  if (!['.pdf', '.docx', '.doc'].includes(ext)) {
    throw new Error('仅支持 PDF、DOCX、DOC 文件')
  }

  const thesisDir = getThesisFilesDirNew(thesis.title)
  const referenceDir = path.join(thesisDir, 'references')
  fs.mkdirSync(referenceDir, { recursive: true })

  const fileId = generateId()
  const originalName = path.basename(sourcePath)
  const fileName = `reference_${fileId}${ext}`
  const destPath = uniqueFilePath(referenceDir, fileName)
  fs.copyFileSync(sourcePath, destPath)

  const data = loadThesisReferences(dataDir, thesis.title)
  const file: ReferenceFileRecord = {
    id: fileId,
    thesisId,
    originalName,
    fileName: path.basename(destPath),
    filePath: path.join('references', path.basename(destPath)),
    mimeType: getMimeTypeFromExtension(ext),
    status: 'pending',
    uploadedAt: new Date().toISOString(),
    recognizedAt: null,
    error: null,
  }
  data.referenceFiles.push(file)
  saveThesisReferences(dataDir, thesis.title, data)
  touchThesisUpdatedAt(index, thesisId)
  saveThesesIndex(dataDir, index)
  silenceWatcher()

  return { file, status: 'saved' }
})
```

**Step 6: Add delete-reference-file IPC**

Add:

```ts
ipcMain.handle('delete-reference-file', async (_event, thesisId: string, fileId: string, deleteLinkedReferences = true) => {
  log.info('IPC: delete-reference-file', thesisId, fileId, deleteLinkedReferences)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)
  const thesis = index.theses.find(t => t.id === thesisId)
  if (!thesis) return false

  const data = loadThesisReferences(dataDir, thesis.title)
  const file = data.referenceFiles.find(item => item.id === fileId)
  if (!file) return false

  const absPath = path.join(getThesisDir(dataDir, thesis.title), file.filePath)
  if (fs.existsSync(absPath)) {
    fs.unlinkSync(absPath)
  }

  data.referenceFiles = data.referenceFiles.filter(item => item.id !== fileId)
  if (deleteLinkedReferences) {
    data.references = data.references.filter(reference => reference.sourceFileId !== fileId)
  }

  saveThesisReferences(dataDir, thesis.title, data)
  touchThesisUpdatedAt(index, thesisId)
  saveThesesIndex(dataDir, index)
  silenceWatcher()
  return true
})
```

**Step 7: Run test to verify it passes**

Run: `npm run test -- tests/main/reference-ipc-contract.test.ts`

Expected: PASS.

**Step 8: Run build**

Run: `npm run build`

Expected: PASS.

**Step 9: Commit**

```bash
git add src/main/ipc-handlers.ts tests/main/reference-ipc-contract.test.ts
git commit -m "feat: add reference file import ipc"
```

### Task 3: Add Local DeepSeek API Key Settings

**Files:**
- Create: `src/main/deepseek-settings.ts`
- Create: `tests/main/deepseek-settings.test.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `tests/release/preload-api-contract.test.ts`

**Step 1: Write failing settings tests**

Create `tests/main/deepseek-settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  getDeepSeekSettingsPath,
  loadDeepSeekApiKey,
  saveDeepSeekApiKey,
  clearDeepSeekApiKey,
} from '../../src/main/deepseek-settings'

describe('deepseek settings', () => {
  it('stores api key under userData and not data dir', () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-settings-'))
    const settingsPath = getDeepSeekSettingsPath(userData)
    expect(settingsPath).toBe(path.join(userData, 'deepseek-settings.json'))
  })

  it('round-trips api key', () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-settings-'))
    saveDeepSeekApiKey(userData, 'sk-test')
    expect(loadDeepSeekApiKey(userData)).toBe('sk-test')
  })

  it('clears api key', () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-settings-'))
    saveDeepSeekApiKey(userData, 'sk-test')
    clearDeepSeekApiKey(userData)
    expect(loadDeepSeekApiKey(userData)).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/deepseek-settings.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Implement local settings module**

Create `src/main/deepseek-settings.ts`:

```ts
import * as fs from 'fs'
import * as path from 'path'

interface DeepSeekSettings {
  apiKey?: string
}

export function getDeepSeekSettingsPath(userDataPath: string): string {
  return path.join(userDataPath, 'deepseek-settings.json')
}

function loadSettings(userDataPath: string): DeepSeekSettings {
  try {
    const filePath = getDeepSeekSettingsPath(userDataPath)
    if (!fs.existsSync(filePath)) return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as DeepSeekSettings
  } catch {
    return {}
  }
}

function saveSettings(userDataPath: string, settings: DeepSeekSettings): void {
  fs.mkdirSync(userDataPath, { recursive: true })
  fs.writeFileSync(getDeepSeekSettingsPath(userDataPath), JSON.stringify(settings, null, 2), 'utf8')
}

export function loadDeepSeekApiKey(userDataPath: string): string | null {
  return loadSettings(userDataPath).apiKey || null
}

export function saveDeepSeekApiKey(userDataPath: string, apiKey: string): void {
  const trimmed = apiKey.trim()
  if (!trimmed) throw new Error('DeepSeek API key 不能为空')
  saveSettings(userDataPath, { ...loadSettings(userDataPath), apiKey: trimmed })
}

export function clearDeepSeekApiKey(userDataPath: string): void {
  const settings = loadSettings(userDataPath)
  delete settings.apiKey
  saveSettings(userDataPath, settings)
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/deepseek-settings.test.ts`

Expected: PASS.

**Step 5: Add IPC contract tests**

In `tests/release/preload-api-contract.test.ts`, add expected methods:

```ts
    expect(source).toContain('getDeepSeekApiKeyStatus')
    expect(source).toContain('saveDeepSeekApiKey')
    expect(source).toContain('clearDeepSeekApiKey')
```

**Step 6: Run preload test to verify it fails**

Run: `npm run test -- tests/release/preload-api-contract.test.ts`

Expected: FAIL because methods are not exposed.

**Step 7: Add IPC handlers**

In `src/main/ipc-handlers.ts`, import:

```ts
import { clearDeepSeekApiKey, loadDeepSeekApiKey, saveDeepSeekApiKey } from './deepseek-settings'
```

Add handlers:

```ts
ipcMain.handle('get-deepseek-api-key-status', async () => {
  return { hasKey: !!loadDeepSeekApiKey(getUserDataPath()) }
})

ipcMain.handle('save-deepseek-api-key', async (_event, apiKey: string) => {
  saveDeepSeekApiKey(getUserDataPath(), apiKey)
  return { hasKey: true }
})

ipcMain.handle('clear-deepseek-api-key', async () => {
  clearDeepSeekApiKey(getUserDataPath())
  return { hasKey: false }
})
```

**Step 8: Expose preload methods and renderer types**

In `src/preload/preload.ts` and `src/renderer/types.ts`, add:

```ts
getDeepSeekApiKeyStatus: () => Promise<{ hasKey: boolean }>
saveDeepSeekApiKey: (apiKey: string) => Promise<{ hasKey: boolean }>
clearDeepSeekApiKey: () => Promise<{ hasKey: boolean }>
```

Use IPC channels `get-deepseek-api-key-status`, `save-deepseek-api-key`, and `clear-deepseek-api-key`.

**Step 9: Run focused tests**

Run:

```bash
npm run test -- tests/main/deepseek-settings.test.ts tests/release/preload-api-contract.test.ts
```

Expected: PASS.

**Step 10: Commit**

```bash
git add src/main/deepseek-settings.ts src/main/ipc-handlers.ts src/preload/preload.ts src/renderer/types.ts tests/main/deepseek-settings.test.ts tests/release/preload-api-contract.test.ts
git commit -m "feat: store DeepSeek API key locally"
```

### Task 4: Add Reference Text Extraction Module

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/main/reference-text-extractor.ts`
- Create: `tests/main/reference-text-extractor.test.ts`

**Step 1: Select extraction packages**

Choose maintained packages that work in the Electron main process:

- PDF: prefer `pdfjs-dist` or an equivalent Node PDF text extractor that works in Electron main.
- DOCX: prefer `mammoth`.
- DOC: prefer a best-effort extractor such as `word-extractor`; keep a user-facing fallback telling the user to save as `.docx` if `.doc` extraction fails.

If a package choice is uncertain, install and test it locally before committing.

**Step 2: Install dependencies**

Run the selected install command, for example:

```bash
npm install pdfjs-dist mammoth word-extractor
```

If `.doc` support requires an additional dependency, install it in the same commit only after verifying it works.

**Step 3: Write failing tests for text helpers**

Create `tests/main/reference-text-extractor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  detectReferenceDocumentType,
  extractReferenceCandidateText,
  extractReferenceSection,
  normalizeExtractedText,
} from '../../src/main/reference-text-extractor'

describe('reference text extractor helpers', () => {
  it('detects supported document types from extension', () => {
    expect(detectReferenceDocumentType('/tmp/a.pdf')).toBe('pdf')
    expect(detectReferenceDocumentType('/tmp/a.docx')).toBe('docx')
    expect(detectReferenceDocumentType('/tmp/a.doc')).toBe('doc')
    expect(detectReferenceDocumentType('/tmp/a.txt')).toBeNull()
  })

  it('normalizes whitespace', () => {
    expect(normalizeExtractedText('A\\n\\n B\\t C')).toBe('A B C')
  })

  it('extracts a references section when a heading exists', () => {
    const text = 'Intro text\\nReferences\\n[1] Alpha. 2020.\\n[2] Beta. 2021.'
    expect(extractReferenceSection(text)).toContain('Alpha')
  })

  it('falls back to tail text when no references heading exists', () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\\n')
    const candidate = extractReferenceCandidateText(text, 200)
    expect(candidate).toContain('line 199')
    expect(candidate.length).toBeLessThanOrEqual(200)
  })
})
```

**Step 4: Run test to verify it fails**

Run: `npm run test -- tests/main/reference-text-extractor.test.ts`

Expected: FAIL because the module does not exist.

**Step 5: Implement helper functions**

Create `src/main/reference-text-extractor.ts`:

```ts
import * as fs from 'fs'
import * as path from 'path'

export type ReferenceDocumentType = 'pdf' | 'docx' | 'doc'

export function detectReferenceDocumentType(filePath: string): ReferenceDocumentType | null {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (ext === '.docx') return 'docx'
  if (ext === '.doc') return 'doc'
  return null
}

export function normalizeExtractedText(text: string): string {
  return text.replace(/\\s+/g, ' ').trim()
}

export function extractReferenceSection(text: string): string {
  const match = text.match(/(?:references|bibliography|参考文献|参考资料)\\s*[:：]?\\s*([\\s\\S]*)/i)
  return match ? match[1].trim() : ''
}

export function extractReferenceCandidateText(text: string, maxChars = 12000): string {
  const section = extractReferenceSection(text)
  const source = section || text
  return source.slice(Math.max(0, source.length - maxChars))
}
```

Then add package-based extraction functions:

```ts
export async function extractTextFromReferenceDocument(filePath: string): Promise<string> {
  const type = detectReferenceDocumentType(filePath)
  if (!type) throw new Error('仅支持 PDF、DOCX、DOC 文件')

  if (type === 'pdf') {
    // Use pdfjs-dist legacy build in Electron main and concatenate page text items.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // ...
  }

  if (type === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    return normalizeExtractedText(result.value || '')
  }

  // Try word-extractor for DOC and keep a clear fallback if extraction fails.
  throw new Error('DOC 文档暂时无法提取文本，请另存为 DOCX 后重试')
}
```

If real `.doc` extraction is implemented, keep the fallback error path for unsupported `.doc` files and add a test fixture when practical.

**Step 6: Run helper tests**

Run: `npm run test -- tests/main/reference-text-extractor.test.ts`

Expected: PASS for helper tests.

**Step 7: Commit**

```bash
git add package.json package-lock.json src/main/reference-text-extractor.ts tests/main/reference-text-extractor.test.ts
git commit -m "feat: add reference document text extraction"
```

### Task 5: Add DeepSeek Recognition Client

**Files:**
- Create: `src/main/deepseek-client.ts`
- Create: `tests/main/deepseek-client.test.ts`

**Step 1: Write failing DeepSeek client tests**

Create `tests/main/deepseek-client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { parseDeepSeekReferenceJson, recognizeReferencesWithDeepSeek } from '../../src/main/deepseek-client'

describe('deepseek client', () => {
  it('parses valid reference json', () => {
    const result = parseDeepSeekReferenceJson(JSON.stringify({
      references: [
        { title: 'A', authors: 'B', year: '2020' },
        { title: '', authors: 'C', year: '2021' },
      ],
    }))

    expect(result).toEqual([{ title: 'A', authors: 'B', year: '2020' }])
  })

  it('throws on invalid json shape', () => {
    expect(() => parseDeepSeekReferenceJson('{"items":[]}')).toThrow('DeepSeek 返回格式不正确')
  })

  it('calls DeepSeek chat completions with JSON response format', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ references: [{ title: 'A', authors: 'B', year: '2020' }] }),
            },
          },
        ],
      }),
    })

    const result = await recognizeReferencesWithDeepSeek({
      apiKey: 'sk-test',
      text: 'References A B 2020',
      fetchImpl: fetchMock as any,
    })

    expect(result).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
          'Content-Type': 'application/json',
        }),
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/deepseek-client.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Implement DeepSeek client**

Create `src/main/deepseek-client.ts`:

```ts
export interface RecognizedReferenceInput {
  title: string
  authors: string
  year: string
}

interface RecognizeParams {
  apiKey: string
  text: string
  fetchImpl?: typeof fetch
}

export function parseDeepSeekReferenceJson(raw: string): RecognizedReferenceInput[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('DeepSeek 返回格式不正确')
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as any).references)) {
    throw new Error('DeepSeek 返回格式不正确')
  }

  return (parsed as any).references
    .map((item: any) => ({
      title: typeof item.title === 'string' ? item.title.trim() : '',
      authors: typeof item.authors === 'string' ? item.authors.trim() : '',
      year: typeof item.year === 'string' ? item.year.trim() : '',
    }))
    .filter((item: RecognizedReferenceInput) => item.title && item.authors && item.year)
}

export async function recognizeReferencesWithDeepSeek(params: RecognizeParams): Promise<RecognizedReferenceInput[]> {
  const fetchImpl = params.fetchImpl || fetch
  const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            '你是参考文献识别助手。',
            '请只返回 JSON 对象，格式为 {"references":[{"title":"...","authors":"...","year":"..."}]}。',
            '不要返回 Markdown，不要解释。',
          ].join('\\n'),
        },
        {
          role: 'user',
          content: `从下面文本中识别参考文献，只提取标题、作者、年份：\\n\\n${params.text}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepSeek 请求失败: ${response.status}`)
  }

  const data = await response.json() as any
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('DeepSeek 返回格式不正确')
  }

  return parseDeepSeekReferenceJson(content)
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/deepseek-client.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/deepseek-client.ts tests/main/deepseek-client.test.ts
git commit -m "feat: add DeepSeek reference recognition client"
```

### Task 6: Wire Import IPC to Extraction and Recognition

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `tests/main/reference-ipc-contract.test.ts`

**Step 1: Extend failing contract tests**

In `tests/main/reference-ipc-contract.test.ts`, add:

```ts
  it('uses extraction, DeepSeek settings, and recognition in import flow', () => {
    expect(source).toContain('extractTextFromReferenceDocument')
    expect(source).toContain('extractReferenceCandidateText')
    expect(source).toContain('loadDeepSeekApiKey')
    expect(source).toContain('recognizeReferencesWithDeepSeek')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/reference-ipc-contract.test.ts`

Expected: FAIL because imports and calls are not wired.

**Step 3: Add imports**

In `src/main/ipc-handlers.ts`, import:

```ts
import { extractReferenceCandidateText, extractTextFromReferenceDocument } from './reference-text-extractor'
import { recognizeReferencesWithDeepSeek } from './deepseek-client'
import { loadDeepSeekApiKey } from './deepseek-settings'
```

**Step 4: Update import-reference-file handler**

After saving the file metadata, update status and run extraction/recognition:

```ts
  try {
    file.status = 'recognizing'
    saveThesisReferences(dataDir, thesis.title, data)

    const apiKey = loadDeepSeekApiKey(getUserDataPath())
    if (!apiKey) {
      throw new Error('请先设置 DeepSeek API key')
    }

    const extractedText = await extractTextFromReferenceDocument(destPath)
    const candidateText = extractReferenceCandidateText(extractedText)
    if (!candidateText) {
      throw new Error('未识别到可提取文字')
    }

    const recognizedReferences = await recognizeReferencesWithDeepSeek({
      apiKey,
      text: candidateText,
    })

    file.status = 'pending'
    file.error = null
    saveThesisReferences(dataDir, thesis.title, data)
    silenceWatcher()

    return {
      file,
      status: 'saved',
      recognizedReferences,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '识别失败'
    file.status = 'failed'
    file.error = message
    saveThesisReferences(dataDir, thesis.title, data)
    silenceWatcher()
    return { file, status: 'failed', error: message }
  }
```

Adjust the `ImportedReferenceFileResult` type to include:

```ts
recognizedReferences?: Array<{ title: string; authors: string; year: string }>
```

**Step 5: Run focused tests**

Run:

```bash
npm run test -- tests/main/reference-ipc-contract.test.ts tests/main/reference-text-extractor.test.ts tests/main/deepseek-client.test.ts
```

Expected: PASS.

**Step 6: Run build**

Run: `npm run build`

Expected: PASS.

**Step 7: Commit**

```bash
git add src/main/ipc-handlers.ts tests/main/reference-ipc-contract.test.ts
git commit -m "feat: recognize uploaded reference files"
```

### Task 7: Add Save Recognized References IPC

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `tests/main/reference-ipc-contract.test.ts`
- Modify: `tests/release/preload-api-contract.test.ts`

**Step 1: Write failing tests**

In `tests/main/reference-ipc-contract.test.ts`, add:

```ts
  it('registers recognized reference save handler', () => {
    expect(source).toContain("'save-recognized-references'")
  })
```

In `tests/release/preload-api-contract.test.ts`, add:

```ts
    expect(source).toContain('saveRecognizedReferences')
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -- tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts
```

Expected: FAIL.

**Step 3: Add handler**

In `src/main/ipc-handlers.ts`, add:

```ts
ipcMain.handle('save-recognized-references', async (
  _event,
  thesisId: string,
  sourceFileId: string,
  references: Array<{ title: string; authors: string; year: string }>
) => {
  log.info('IPC: save-recognized-references', thesisId, sourceFileId, references.length)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)
  const thesis = index.theses.find(t => t.id === thesisId)
  if (!thesis) throw new Error('未找到对应论文')

  const data = loadThesisReferences(dataDir, thesis.title)
  const file = data.referenceFiles.find(item => item.id === sourceFileId)
  if (!file) throw new Error('未找到来源文件')

  const now = new Date().toISOString()
  const cleaned = references
    .map(item => ({
      title: item.title?.trim() || '',
      authors: item.authors?.trim() || '',
      year: item.year?.trim() || '',
    }))
    .filter(item => item.title && item.authors && item.year)

  const newReferences: ReferenceRecord[] = cleaned.map(item => ({
    id: generateId(),
    thesisId,
    sourceFileId,
    title: item.title,
    authors: item.authors,
    year: item.year,
    createdAt: now,
  }))

  data.references = [
    ...data.references.filter(reference => reference.sourceFileId !== sourceFileId),
    ...newReferences,
  ]
  file.status = 'ready'
  file.recognizedAt = now
  file.error = null

  saveThesisReferences(dataDir, thesis.title, data)
  touchThesisUpdatedAt(index, thesisId)
  saveThesesIndex(dataDir, index)
  silenceWatcher()
  return data.references
})
```

**Step 4: Expose preload and renderer APIs**

Add:

```ts
saveRecognizedReferences: (
  thesisId: string,
  sourceFileId: string,
  references: Array<{ title: string; authors: string; year: string }>
) => Promise<ReferenceRecord[]>
```

Use IPC channel `save-recognized-references`.

Also expose:

```ts
selectReferenceFile: () => Promise<string | null>
importReferenceFile: (thesisId: string, sourcePath: string) => Promise<ImportedReferenceFileResult>
deleteReferenceFile: (thesisId: string, fileId: string, deleteLinkedReferences?: boolean) => Promise<boolean>
```

Update `ReferenceRecord`, `ReferenceFileRecord`, and `ImportedReferenceFileResult` types consistently in preload and renderer.

**Step 5: Run tests**

Run:

```bash
npm run test -- tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts
```

Expected: PASS.

**Step 6: Run build**

Run: `npm run build`

Expected: PASS.

**Step 7: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/preload.ts src/renderer/types.ts tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts
git commit -m "feat: save confirmed recognized references"
```

### Task 8: Add DeepSeek Key Prompt UI

**Files:**
- Create: `src/renderer/components/DeepSeekKeyModal.tsx`
- Modify: `tests/release/reference-ui-contract.test.ts`

**Step 1: Write failing UI contract tests**

In `tests/release/reference-ui-contract.test.ts`, add:

```ts
  it('includes a DeepSeek key modal for local API key setup', () => {
    const source = fs.readFileSync('src/renderer/components/DeepSeekKeyModal.tsx', 'utf8')
    expect(source).toContain('DeepSeek API key')
    expect(source).toContain('saveDeepSeekApiKey')
    expect(source).toContain('本机')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: FAIL because the component does not exist.

**Step 3: Create DeepSeekKeyModal**

Create `src/renderer/components/DeepSeekKeyModal.tsx`:

```tsx
import { useState } from 'react'

interface DeepSeekKeyModalProps {
  onClose: () => void
  onSaved: () => void
}

function DeepSeekKeyModal({ onClose, onSaved }: DeepSeekKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      setError('请输入 DeepSeek API key')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await window.electronAPI.saveDeepSeekApiKey(trimmed)
      onSaved()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[520px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">设置 DeepSeek API key</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-text">关闭</button>
        </div>
        <p className="text-muted text-sm">API key 只保存在本机，不会同步到坚果云。</p>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
          placeholder="sk-..."
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-base border border-border text-sm font-bold">取消</button>
          <button type="button" disabled={isSaving} onClick={handleSave} className="h-10 px-5 rounded-base bg-primary text-white text-sm font-bold disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  )
}

export default DeepSeekKeyModal
```

**Step 4: Run test**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/DeepSeekKeyModal.tsx tests/release/reference-ui-contract.test.ts
git commit -m "feat: add DeepSeek key setup modal"
```

### Task 9: Add Recognition Confirmation Modal

**Files:**
- Create: `src/renderer/components/ReferenceRecognitionModal.tsx`
- Modify: `tests/release/reference-ui-contract.test.ts`

**Step 1: Write failing UI contract test**

In `tests/release/reference-ui-contract.test.ts`, add:

```ts
  it('includes an editable recognition confirmation modal', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceRecognitionModal.tsx', 'utf8')
    expect(source).toContain('识别结果')
    expect(source).toContain('onConfirm')
    expect(source).toContain('title')
    expect(source).toContain('authors')
    expect(source).toContain('year')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: FAIL.

**Step 3: Create modal**

Create `src/renderer/components/ReferenceRecognitionModal.tsx`:

```tsx
import { useState } from 'react'

interface RecognizedReferenceDraft {
  title: string
  authors: string
  year: string
}

interface ReferenceRecognitionModalProps {
  fileName: string
  references: RecognizedReferenceDraft[]
  onCancel: () => void
  onConfirm: (references: RecognizedReferenceDraft[]) => void | Promise<void>
}

function ReferenceRecognitionModal({ fileName, references, onCancel, onConfirm }: ReferenceRecognitionModalProps) {
  const [drafts, setDrafts] = useState(references)
  const [isSaving, setIsSaving] = useState(false)

  const updateDraft = (index: number, field: keyof RecognizedReferenceDraft, value: string) => {
    setDrafts(prev => prev.map((draft, i) => i === index ? { ...draft, [field]: value } : draft))
  }

  const removeDraft = (index: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = async () => {
    const valid = drafts.filter(item => item.title.trim() && item.authors.trim() && item.year.trim())
    if (valid.length === 0) {
      alert('没有可保存的参考文献')
      return
    }
    setIsSaving(true)
    try {
      await onConfirm(valid)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[760px] max-h-[82vh] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-text font-bold text-lg">确认识别结果</h2>
          <p className="text-muted text-xs mt-1">{fileName}</p>
        </div>
        <div className="overflow-auto flex flex-col gap-3 pr-1">
          {drafts.map((draft, index) => (
            <div key={index} className="rounded-base border border-border p-3 grid grid-cols-[1fr_1fr_96px_auto] gap-2 items-end">
              <label className="text-xs font-bold text-text flex flex-col gap-1">标题<input value={draft.title} onChange={e => updateDraft(index, 'title', e.target.value)} className="h-9 rounded-base border border-border px-2 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-text flex flex-col gap-1">作者<input value={draft.authors} onChange={e => updateDraft(index, 'authors', e.target.value)} className="h-9 rounded-base border border-border px-2 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-text flex flex-col gap-1">年份<input value={draft.year} onChange={e => updateDraft(index, 'year', e.target.value)} className="h-9 rounded-base border border-border px-2 text-sm font-normal" /></label>
              <button type="button" onClick={() => removeDraft(index)} className="h-9 px-3 text-danger text-xs font-bold">删除</button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-10 px-5 rounded-base border border-border text-sm font-bold">取消</button>
          <button type="button" disabled={isSaving} onClick={handleConfirm} className="h-10 px-5 rounded-base bg-primary text-white text-sm font-bold disabled:opacity-50">确认保存</button>
        </div>
      </div>
    </div>
  )
}

export default ReferenceRecognitionModal
```

**Step 4: Run test**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/components/ReferenceRecognitionModal.tsx tests/release/reference-ui-contract.test.ts
git commit -m "feat: add reference recognition confirmation modal"
```

### Task 10: Replace Manual Reference UI With File Upload Flow

**Files:**
- Modify: `src/renderer/components/ReferenceSection.tsx`
- Delete or stop using: `src/renderer/components/ReferenceModal.tsx`
- Modify: `src/renderer/components/Timeline.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `tests/release/reference-ui-contract.test.ts`

**Step 1: Write failing UI contract tests**

Update `tests/release/reference-ui-contract.test.ts` to assert:

```ts
  it('reference section exposes file upload instead of manual add copy', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceSection.tsx', 'utf8')
    expect(source).toContain('上传参考文献文件')
    expect(source).toContain('referenceFiles')
    expect(source).toContain('onUploadReferenceFile')
    expect(source).not.toContain('新增参考文献')
  })

  it('app wires reference import and confirmation flow', () => {
    const source = fs.readFileSync('src/renderer/App.tsx', 'utf8')
    expect(source).toContain('importReferenceFile')
    expect(source).toContain('saveRecognizedReferences')
    expect(source).toContain('ReferenceRecognitionModal')
    expect(source).toContain('DeepSeekKeyModal')
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: FAIL.

**Step 3: Update ReferenceSection props**

Change `ReferenceSection` to accept:

```ts
interface ReferenceSectionProps {
  referenceFiles: ReferenceFileRecord[]
  references: ReferenceRecord[]
  onUploadReferenceFile: () => void | Promise<void>
  onDeleteReferenceFile: (fileId: string) => void | Promise<void>
  onDeleteReference: (referenceId: string) => void | Promise<void>
}
```

Render:

- Header: `参考文献 {references.length}`
- Button: `上传参考文献文件`
- File list with status labels.
- Reference list with `reference.sourceFileId` displayed as source file name when available.

Remove `ReferenceModal` usage from `ReferenceSection`.

**Step 4: Update Timeline props**

In `Timeline.tsx`, pass `referenceFiles`, `onUploadReferenceFile`, `onDeleteReferenceFile`, and `onDeleteReference` into `ReferenceSection`.

**Step 5: Update App state**

In `App.tsx`:

- Track `referenceFiles` separately or derive from a new `ReferenceData` state.
- Track pending recognition:

```ts
const [pendingRecognition, setPendingRecognition] = useState<{
  sourceFileId: string
  fileName: string
  references: Array<{ title: string; authors: string; year: string }>
} | null>(null)
const [showDeepSeekKeyModal, setShowDeepSeekKeyModal] = useState(false)
```

Update `loadReferences` to handle the new API shape. If `getReferences` continues to return only references, add a new `getReferenceData` IPC first; otherwise rename `getReferences` to return `{ referenceFiles, references }` and update all call sites.

Recommended minimal path: add `getReferenceData` IPC in the previous IPC task before this UI task.

**Step 6: Add App upload handler**

Implement:

```ts
const handleUploadReferenceFile = async () => {
  if (!currentThesisId) return
  const keyStatus = await window.electronAPI.getDeepSeekApiKeyStatus()
  if (!keyStatus.hasKey) {
    setShowDeepSeekKeyModal(true)
    return
  }

  const filePath = await window.electronAPI.selectReferenceFile()
  if (!filePath) return

  const thesisIdAtStart = currentThesisId
  const result = await window.electronAPI.importReferenceFile(thesisIdAtStart, filePath)
  await loadReferences(thesisIdAtStart)

  if (currentThesisIdRef.current !== thesisIdAtStart) return

  if (result.status === 'failed') {
    alert(result.error || '识别失败')
    return
  }

  if (result.recognizedReferences?.length) {
    setPendingRecognition({
      sourceFileId: result.file.id,
      fileName: result.file.originalName,
      references: result.recognizedReferences,
    })
  } else {
    alert('未识别到参考文献')
  }
}
```

**Step 7: Add confirmation handler**

Implement:

```ts
const handleConfirmRecognizedReferences = async (drafts: Array<{ title: string; authors: string; year: string }>) => {
  if (!currentThesisId || !pendingRecognition) return
  await window.electronAPI.saveRecognizedReferences(currentThesisId, pendingRecognition.sourceFileId, drafts)
  await loadReferences(currentThesisId)
  setPendingRecognition(null)
  setToast('参考文献识别结果已保存')
  setTimeout(() => setToast(null), 3000)
}
```

**Step 8: Add delete file handler**

Implement:

```ts
const handleDeleteReferenceFile = async (fileId: string) => {
  if (!currentThesisId) return
  if (!confirm('确定删除这个参考文献文件吗？由它识别出的条目也会一起删除。')) return
  await window.electronAPI.deleteReferenceFile(currentThesisId, fileId, true)
  await loadReferences(currentThesisId)
}
```

**Step 9: Render modals**

In `App.tsx`, render `DeepSeekKeyModal` and `ReferenceRecognitionModal`.

When DeepSeek key is saved, close the modal and optionally call `handleUploadReferenceFile()` again.

**Step 10: Run focused UI contract tests**

Run: `npm run test -- tests/release/reference-ui-contract.test.ts`

Expected: PASS.

**Step 11: Run build**

Run: `npm run build`

Expected: PASS.

**Step 12: Commit**

```bash
git add src/renderer/App.tsx src/renderer/components/ReferenceSection.tsx src/renderer/components/Timeline.tsx src/renderer/components/DeepSeekKeyModal.tsx src/renderer/components/ReferenceRecognitionModal.tsx tests/release/reference-ui-contract.test.ts
git commit -m "feat: add reference file upload recognition UI"
```

### Task 11: Add Reference Data API Shape

Execution note: complete this task before Task 10 if the UI has not already been migrated. The upload UI needs `getReferenceData` so it can render `referenceFiles` and `references` together.

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `tests/main/reference-ipc-contract.test.ts`
- Modify: `tests/release/preload-api-contract.test.ts`

**Step 1: Write failing tests**

In `tests/main/reference-ipc-contract.test.ts`, add:

```ts
  it('registers a full reference data handler', () => {
    expect(source).toContain("'get-reference-data'")
    expect(source).toContain('referenceFiles')
  })
```

In `tests/release/preload-api-contract.test.ts`, add:

```ts
    expect(source).toContain('getReferenceData')
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npm run test -- tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts
```

Expected: FAIL.

**Step 3: Add IPC**

In `src/main/ipc-handlers.ts`, add:

```ts
ipcMain.handle('get-reference-data', async (_event, thesisId: string) => {
  log.info('IPC: get-reference-data', thesisId)
  const dataDir = getDataDir()
  const index = loadThesesIndex(dataDir)
  const thesis = index.theses.find(t => t.id === thesisId)
  if (!thesis) return { referenceFiles: [], references: [] }
  return loadThesisReferences(dataDir, thesis.title)
})
```

Keep `get-references` for backward compatibility and existing tests.

**Step 4: Expose preload and renderer type**

Add `ReferenceData` type:

```ts
export interface ReferenceData {
  referenceFiles: ReferenceFileRecord[]
  references: ReferenceRecord[]
}
```

Add:

```ts
getReferenceData: (thesisId: string) => Promise<ReferenceData>
```

**Step 5: Update App loadReferences**

Use `window.electronAPI.getReferenceData(thesisId)` and set both `referenceFiles` and `references`.

**Step 6: Run tests and build**

Run:

```bash
npm run test -- tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts
npm run build
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/main/ipc-handlers.ts src/preload/preload.ts src/renderer/types.ts src/renderer/App.tsx tests/main/reference-ipc-contract.test.ts tests/release/preload-api-contract.test.ts
git commit -m "feat: expose full reference data API"
```

### Task 12: Integrate File Watcher for Reference Files

**Files:**
- Modify: `src/main/file-watcher.ts`
- Modify: `tests/main/file-watcher.test.ts`

**Step 1: Write failing watcher test**

In `tests/main/file-watcher.test.ts`, add a test that writes a file under `<thesis>/references/reference_a.pdf` and expects `onReferencesChanged('test-thesis')`.

Example:

```ts
  it('detects reference file changes in thesis references subdirectory', async () => {
    const onReferencesChanged = vi.fn()
    const watcher = createFileWatcher(tmpDir, {
      onThesesChanged: vi.fn(),
      onVersionsChanged: vi.fn(),
      onReferencesChanged,
      onConflictDetected: vi.fn(),
    })
    watcher.start()
    const thesisDir = path.join(tmpDir, 'test-thesis', 'references')
    fs.mkdirSync(thesisDir, { recursive: true })
    fs.writeFileSync(path.join(thesisDir, 'reference.pdf'), 'data')

    await waitFor(() => expect(onReferencesChanged).toHaveBeenCalledWith('test-thesis'))
    watcher.stop()
  })
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/file-watcher.test.ts`

Expected: FAIL if nested reference file changes are ignored.

**Step 3: Update watcher**

In `src/main/file-watcher.ts`, treat paths shaped `<thesis-dir>/references/<file>` as reference changes and debounce under `references:${thesisDirName}`.

**Step 4: Run watcher test**

Run: `npm run test -- tests/main/file-watcher.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/file-watcher.ts tests/main/file-watcher.test.ts
git commit -m "feat: watch uploaded reference files"
```

### Task 13: Final Verification

**Files:**
- No source edits expected.

**Step 1: Run full test suite**

Run: `npm test`

Expected: all tests pass.

**Step 2: Run production build**

Run: `npm run build`

Expected: build succeeds.

**Step 3: Manual smoke test**

Run the app:

```bash
npm run dev
```

Manually verify:

- Reference section shows upload flow, not manual-only add flow.
- If no DeepSeek key exists, upload prompts for key and says it is local-only.
- Uploading a text-based PDF or DOCX copies the original file under the current thesis `references/` folder.
- Recognition failure keeps the original file and shows a failed status.
- Recognition success opens confirmation modal.
- Confirming writes entries to `references.json`.
- Deleting a source file removes only linked references and its file.
- Switching thesis during recognition does not save to the wrong thesis.

**Step 4: Inspect data directory**

Open the configured data directory and verify:

```text
<thesis>/references/reference_<id>.<ext>
<thesis>/references.json
```

Verify no DeepSeek API key appears in that data directory.

**Step 5: Commit manual verification note if needed**

If the project uses manual verification commits, commit a short docs note. Otherwise do not create a commit.

**Step 6: Final status**

Report:

- tests run and pass/fail counts,
- build result,
- manual smoke result,
- any remaining limitations, especially scanned PDF OCR and `.doc` extraction limitations if applicable.
