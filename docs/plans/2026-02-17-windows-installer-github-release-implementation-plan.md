# Windows Installer GitHub Release Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and publish an installable Windows x64 NSIS package to GitHub Releases for this repository.

**Architecture:** Keep the current Electron + Vite build pipeline, but decouple runtime data storage from hard-coded local paths by routing storage to `app.getPath('userData')`. Package with `electron-builder` as NSIS (`x64`), then publish `.exe` artifacts through GitHub Releases using a repeatable command and checklist flow.

**Tech Stack:** Electron 28, React 18, TypeScript 5, Vite 5, electron-builder 24, Node.js/npm, GitHub Releases.

---

Skill refs for execution: `@test-driven-development`, `@systematic-debugging`, `@verification-before-completion`.

### Task 1: Add Release-Focused Test Harness (Main Process Utilities)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/main/path-resolver.ts`
- Create: `tests/main/path-resolver.test.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { resolveDataDir } from '../../src/main/path-resolver'

describe('resolveDataDir', () => {
  it('stores app data under Electron userData path', () => {
    const fakeGetPath = (name: string) =>
      name === 'userData' ? 'C:/Users/test/AppData/Roaming/thesis-tracker' : ''
    const dir = resolveDataDir(fakeGetPath)
    expect(dir).toBe('C:/Users/test/AppData/Roaming/thesis-tracker/data')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/path-resolver.test.ts`  
Expected: FAIL with module-not-found for `src/main/path-resolver`.

**Step 3: Write minimal implementation**

```ts
// src/main/path-resolver.ts
import * as path from 'path'

export type GetPath = (name: 'userData') => string

export function resolveDataDir(getPath: GetPath): string {
  return path.join(getPath('userData'), 'data')
}
```

Also add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}
```

And create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/main/path-resolver.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add vitest.config.ts tests/main/path-resolver.test.ts src/main/path-resolver.ts package.json package-lock.json
git commit -m "test: add path resolver tests and vitest harness"
```

### Task 2: Migrate Runtime Data Path Away From Hard-Coded Local Directory

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Test: `tests/main/ipc-data-path.test.ts`

**Step 1: Write the failing test**

Create test:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('ipc data path source', () => {
  it('does not include hard-coded E drive data path', () => {
    const source = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8')
    expect(source.includes("path.join('E:'")).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/main/ipc-data-path.test.ts`  
Expected: FAIL because old hard-coded path still exists.

**Step 3: Write minimal implementation**

Refactor `src/main/ipc-handlers.ts`:

```ts
import { app } from 'electron'
import { resolveDataDir } from './path-resolver'

function getDataDir(): string {
  const dataDir = resolveDataDir((name) => app.getPath(name))
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}
```

**Step 4: Run tests and build**

Run:
1. `npm run test -- tests/main/path-resolver.test.ts`
2. `npm run test -- tests/main/ipc-data-path.test.ts`
3. `npm run build`

Expected:
1. PASS
2. PASS
3. PASS

**Step 5: Commit**

```bash
git add src/main/ipc-handlers.ts tests/main/ipc-data-path.test.ts
git commit -m "refactor: move app data storage to userData directory"
```

### Task 3: Lock `electron-builder` to NSIS Installer (x64)

**Files:**
- Create: `tests/release/electron-builder-config.test.ts`
- Modify: `electron-builder.json`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('electron-builder config', () => {
  it('targets nsis installer for windows x64', () => {
    const config = JSON.parse(fs.readFileSync('electron-builder.json', 'utf8'))
    const winTarget = config.win.target
    expect(JSON.stringify(winTarget)).toContain('nsis')
    expect(JSON.stringify(winTarget)).not.toContain('portable')
    expect(JSON.stringify(winTarget)).toContain('x64')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/electron-builder-config.test.ts`  
Expected: FAIL because current target includes `portable`.

**Step 3: Write minimal implementation**

Update `electron-builder.json`:

```json
{
  "directories": { "output": "release" },
  "win": {
    "target": [{ "target": "nsis", "arch": ["x64"] }],
    "artifactName": "${productName}-Setup-${version}.${ext}"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/release/electron-builder-config.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add electron-builder.json tests/release/electron-builder-config.test.ts
git commit -m "build: switch windows target to nsis installer"
```

### Task 4: Add Deterministic Release Scripts

**Files:**
- Create: `tests/release/package-scripts.test.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('package scripts', () => {
  it('includes dist:win and release:local scripts', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    expect(pkg.scripts['dist:win']).toBeDefined()
    expect(pkg.scripts['release:local']).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/package-scripts.test.ts`  
Expected: FAIL because scripts do not exist yet.

**Step 3: Write minimal implementation**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dist:win": "electron-builder --win nsis --x64",
    "release:local": "npm run build && npm run dist:win"
  }
}
```

**Step 4: Run test to verify it passes**

Run:
1. `npm run test -- tests/release/package-scripts.test.ts`
2. `npm run release:local`

Expected:
1. PASS
2. NSIS artifact generated under `release/` (or fail with explicit permission issue to fix in Task 6).

**Step 5: Commit**

```bash
git add package.json package-lock.json tests/release/package-scripts.test.ts
git commit -m "chore: add deterministic windows release scripts"
```

### Task 5: Document Manual GitHub Release Workflow

**Files:**
- Create: `docs/release/windows-github-release.md`
- Create: `docs/release/windows-release-checklist.md`
- Create: `tests/release/release-docs.test.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

Create test:

```ts
import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('release docs', () => {
  it('contains required local release command and GitHub release steps', () => {
    const doc = fs.readFileSync('docs/release/windows-github-release.md', 'utf8')
    expect(doc).toContain('npm run release:local')
    expect(doc).toContain('GitHub Release')
    expect(doc).toContain('unsigned')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/release/release-docs.test.ts`  
Expected: FAIL because docs/test file do not exist yet.

**Step 3: Write minimal implementation**

Add docs with exact steps:

```md
1. npm ci
2. npm run release:local
3. Create tag vX.Y.Z
4. Create GitHub Release
5. Upload release/*.exe
6. Mark unsigned warning in notes
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/release/release-docs.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/release/windows-github-release.md docs/release/windows-release-checklist.md README.md tests/release/release-docs.test.ts
git commit -m "docs: add windows github release runbook and checklist"
```

### Task 6: Resolve Local Packaging Permission Gate and Verify End-to-End

**Files:**
- Modify: `docs/release/windows-github-release.md`
- Modify: `docs/release/windows-release-checklist.md`

**Step 1: Write the failing verification**

Run: `npm run release:local`  
Expected: FAIL in environments without symlink permission (known `winCodeSign` extraction issue).

**Step 2: Capture root cause and remediation in docs**

Document required local setup options:
1. Run terminal as Administrator, or
2. Enable Windows Developer Mode, then retry packaging.

**Step 3: Re-run release command after remediation**

Run: `npm run release:local`  
Expected: PASS, installer generated in `release/`.

**Step 4: Validate artifact manually**

Run and check:
1. Install `.exe`
2. Launch app
3. Create thesis + version
4. Restart app and confirm persistence
5. Uninstall app

Expected: All checks pass.

**Step 5: Commit**

```bash
git add docs/release/windows-github-release.md docs/release/windows-release-checklist.md
git commit -m "docs: add packaging permission remediation and final verification"
```

### Task 7: Publish to GitHub Releases

**Files:**
- Modify: `package.json` (version bump)
- Modify: `docs/release/windows-release-checklist.md` (record release metadata)

**Step 1: Write the failing pre-check**

Run:
1. `node -p \"require('./package.json').version\"`
2. `git tag --list \"v$(node -p \"require('./package.json').version\")\"`

Expected: No matching tag yet.

**Step 2: Create release version and tag**

Run:

```bash
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version for windows installer release"
git tag v<new-version>
```

**Step 3: Push commit and tag**

Run:

```bash
git push origin master
git push origin v<new-version>
```

**Step 4: Create GitHub Release and upload artifact**

Use GitHub UI:
1. New Release from `v<new-version>`
2. Upload `release/*.exe`
3. Add release notes and include "unsigned installer" warning

Expected: Public downloadable installer on repository Releases page.

**Step 5: Commit release record (optional but recommended)**

```bash
git add docs/release/windows-release-checklist.md
git commit -m "docs: record v<new-version> release metadata"
git push origin master
```

## Verification Command Bundle (Final Gate)

Run in order:

```bash
npm ci
npm run test
npm run build
npm run release:local
```

Expected:
1. All tests pass.
2. Build succeeds.
3. NSIS `.exe` is present in `release/`.
4. Manual install smoke test passes.
