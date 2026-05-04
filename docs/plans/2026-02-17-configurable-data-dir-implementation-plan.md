# Configurable Data Directory Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement configurable storage path with default app-folder `data` directory and automatic fallback to user directory when app folder is not writable, then republish installer.

**Architecture:** Main process owns directory resolution and persistence of user-selected directory in a config file under `app.getPath('userData')`. Renderer gets structured directory status through IPC and provides a settings modal for selecting/resetting/opening directory. Existing thesis/version data format remains unchanged; only root storage directory resolution changes.

**Tech Stack:** Electron 28, React 18, TypeScript 5, Vitest 2, electron-builder 24, npm.

---

Skill refs for execution: `@test-driven-development`, `@systematic-debugging`, `@verification-before-completion`.

### Task 1: Add Data Directory Strategy Tests

**Files:**
- Create: `tests/main/data-dir-strategy.test.ts`
- Modify: `src/main/path-resolver.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { resolveDataDirCandidates } from '../../src/main/path-resolver'

describe('resolveDataDirCandidates', () => {
  it('returns app-dir data first and userData fallback second', () => {
    const result = resolveDataDirCandidates({
      execPath: 'C:/Program Files/Thesis Progress Tracker/Thesis Progress Tracker.exe',
      userDataPath: 'C:/Users/u/AppData/Roaming/Thesis Progress Tracker'
    })
    expect(result.primary).toContain('/data')
    expect(result.fallback).toContain('/data')
    expect(result.primary).not.toBe(result.fallback)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/data-dir-strategy.test.ts`  
Expected: FAIL because `resolveDataDirCandidates` does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function resolveDataDirCandidates(input: { execPath: string; userDataPath: string }) {
  const appDir = path.dirname(input.execPath)
  return {
    primary: path.join(appDir, 'data'),
    fallback: path.join(input.userDataPath, 'data'),
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/data-dir-strategy.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/main/data-dir-strategy.test.ts src/main/path-resolver.ts
git commit -m "test: add data directory strategy unit tests"
```

### Task 2: Implement Main-Process Data Dir Config + Fallback

**Files:**
- Create: `src/main/data-dir-config.ts`
- Modify: `src/main/ipc-handlers.ts`
- Test: `tests/main/ipc-data-path.test.ts`

**Step 1: Write the failing test**

Add case to `tests/main/ipc-data-path.test.ts`:

```ts
it('exposes directory source and fallback metadata from get-data-dir handler', () => {
  const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')
  expect(source.includes("'source'")).toBe(true)
  expect(source.includes('fallback')).toBe(true)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/ipc-data-path.test.ts`  
Expected: FAIL because old handler returns string only.

**Step 3: Write minimal implementation**

Implement config + resolver utilities in `src/main/data-dir-config.ts`:
- `getDataDirStatus()`
- `setCustomDataDir(path)`
- `resetCustomDataDir()`
- `openDataDir()`
- writable check helper (`mkdir + write temp + delete temp`)

Refactor `src/main/ipc-handlers.ts`:
- use `getDataDirStatus().effectivePath` for all file operations
- return structured status from `get-data-dir`
- implement real `select-data-dir` folder picker
- add `reset-data-dir` and `open-data-dir`

**Step 4: Run tests and build**

Run:
1. `npm run test -- tests/main/ipc-data-path.test.ts`
2. `npm run build`

Expected:
1. PASS
2. PASS

**Step 5: Commit**

```bash
git add src/main/data-dir-config.ts src/main/ipc-handlers.ts tests/main/ipc-data-path.test.ts
git commit -m "feat: add configurable data dir with app-folder default and fallback"
```

### Task 3: Extend Preload and Type Contracts

**Files:**
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`

**Step 1: Write the failing test**

Create `tests/release/preload-api-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('preload api contract', () => {
  it('includes resetDataDir and openDataDir ipc methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('resetDataDir')
    expect(source).toContain('openDataDir')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/preload-api-contract.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

In preload and renderer types:
- `getDataDir(): Promise<DataDirStatus>`
- `selectDataDir(): Promise<DataDirStatus | null>`
- `resetDataDir(): Promise<DataDirStatus>`
- `openDataDir(): Promise<boolean>`
- Add `DataDirStatus` type fields:
  - `effectivePath`
  - `source`
  - `fallbackMessage?`

**Step 4: Run test**

Run: `npm run test -- tests/release/preload-api-contract.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/preload/preload.ts src/renderer/types.ts tests/release/preload-api-contract.test.ts
git commit -m "feat: extend renderer/main data directory ipc contract"
```

### Task 4: Build Settings Modal and Sidebar Integration

**Files:**
- Create: `src/renderer/components/SettingsModal.tsx`
- Modify: `src/renderer/components/Sidebar.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Write the failing test**

Create `tests/release/settings-ui-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('settings ui contract', () => {
  it('renders controls for select/reset/open data directory', () => {
    const source = fs.readFileSync('src/renderer/components/SettingsModal.tsx', 'utf8')
    expect(source).toContain('选择目录')
    expect(source).toContain('恢复默认')
    expect(source).toContain('打开当前目录')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/settings-ui-contract.test.ts`  
Expected: FAIL (file missing).

**Step 3: Write minimal implementation**

1. Add `SettingsModal` with:
   - current path display
   - source tag
   - fallback warning text
   - three action buttons
2. Sidebar settings button opens modal.
3. App state stores `DataDirStatus`.
4. On select/reset/open action, call new preload APIs and refresh status.

**Step 4: Run tests and build**

Run:
1. `npm run test -- tests/release/settings-ui-contract.test.ts`
2. `npm run build`

Expected:
1. PASS
2. PASS

**Step 5: Commit**

```bash
git add src/renderer/components/SettingsModal.tsx src/renderer/components/Sidebar.tsx src/renderer/App.tsx tests/release/settings-ui-contract.test.ts
git commit -m "feat: add settings modal for data directory management"
```

### Task 5: Add Optional Data Migration Action

**Files:**
- Modify: `src/main/data-dir-config.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/preload.ts`
- Modify: `src/renderer/types.ts`
- Modify: `src/renderer/components/SettingsModal.tsx`

**Step 1: Write the failing test**

Create `tests/release/data-migration-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('data migration contract', () => {
  it('provides migrateDataDir api and UI trigger', () => {
    expect(fs.readFileSync('src/preload/preload.ts', 'utf8')).toContain('migrateDataDir')
    expect(fs.readFileSync('src/renderer/components/SettingsModal.tsx', 'utf8')).toContain('迁移现有数据')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/data-migration-contract.test.ts`  
Expected: FAIL.

**Step 3: Write minimal implementation**

1. IPC `migrate-data-dir(targetPath)`:
   - copy `data.json` and `files/` from old dir to target temp location
   - verify copy complete
   - switch config to target
   - cleanup temp
2. On error:
   - keep old directory active
   - return error message
3. UI button `迁移现有数据` with result feedback.

**Step 4: Run tests**

Run: `npm run test -- tests/release/data-migration-contract.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main/data-dir-config.ts src/main/ipc-handlers.ts src/preload/preload.ts src/renderer/types.ts src/renderer/components/SettingsModal.tsx tests/release/data-migration-contract.test.ts
git commit -m "feat: add optional data migration when changing data directory"
```

### Task 6: Update Release Docs and Rebuild Installer

**Files:**
- Modify: `docs/release/windows-github-release.md`
- Modify: `docs/release/windows-release-checklist.md`
- Modify: `README.md`

**Step 1: Write the failing test**

Update `tests/release/release-docs.test.ts` assertions:

```ts
expect(doc).toContain('程序目录')
expect(doc).toContain('自动回退')
expect(doc).toContain('设置页面')
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/release-docs.test.ts`  
Expected: FAIL until docs updated.

**Step 3: Write minimal implementation**

Update docs with:
- default app-folder `data`
- fallback to userData when not writable
- settings path management and migration option

**Step 4: Run full verification bundle**

Run:

```bash
npm ci
npm run test
npm run build
npm run release:local
```

Expected:
- tests all pass
- build passes
- NSIS installer generated in `release/`

**Step 5: Commit**

```bash
git add README.md docs/release/windows-github-release.md docs/release/windows-release-checklist.md tests/release/release-docs.test.ts
git commit -m "docs: document configurable data dir behavior and fallback policy"
```

### Task 7: Publish Updated Installer to GitHub

**Files:**
- Modify: `package.json` (version bump)
- Modify: `package-lock.json`
- Modify: `docs/release/windows-release-checklist.md` (release record)

**Step 1: Pre-check**

Run:

```bash
node -p "require('./package.json').version"
git tag --list
```

Expected: determine next available release version.

**Step 2: Bump, tag, push**

```bash
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version for configurable data-dir release"
git tag v<new-version>
git push origin master
git push origin v<new-version>
```

**Step 3: Publish release asset**

1. Create GitHub Release for `v<new-version>`
2. Upload `release/*.exe`
3. Release notes include:
   - configurable data directory
   - app-folder default + auto fallback
   - settings modal actions

**Step 4: Commit release record**

```bash
git add docs/release/windows-release-checklist.md
git commit -m "docs: record v<new-version> release metadata"
git push origin master
```
