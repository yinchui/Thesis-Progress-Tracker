# Mobile App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把当前仅支持桌面端的 Thesis Progress Tracker 演进为同仓多端项目，先抽离共享核心与平台适配层，再接入一个基于 Capacitor 的移动端外壳，同时保持现有桌面端行为稳定。

**Architecture:** 先用 workspace 和共享包建立新的结构边界，再把现有 Electron 应用中的纯业务逻辑和数据访问边界提取到 `packages/`。桌面端继续作为第一个平台实现，移动端在共享核心稳定后通过 `apps/mobile` 接入，并使用独立的适配器处理存储、生命周期和原生能力。

**Tech Stack:** Electron, React, Vite, TypeScript, Vitest, npm workspaces, Capacitor

---

### Task 1: Bootstrap The Multi-App Workspace

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `packages/core/package.json`
- Create: `packages/data/package.json`
- Create: `packages/ui-tokens/package.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Test: `tests/release/package-scripts.test.ts`

**Step 1: Write the failing test**

Add a release-level contract test that asserts the root manifest declares workspaces for `apps/*` and `packages/*`, and that a placeholder `mobile` workspace exists.

```ts
// tests/release/package-scripts.test.ts
it('declares app and package workspaces for mobile expansion', () => {
  const pkg = readRootPackageJson()

  expect(pkg.private).toBe(true)
  expect(pkg.workspaces).toEqual(
    expect.arrayContaining(['apps/*', 'packages/*'])
  )
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/release/package-scripts.test.ts`
Expected: FAIL because the current root manifest does not yet declare workspace entries.

**Step 3: Write minimal implementation**

Convert the current root manifest into a workspace root without breaking existing desktop scripts. Add minimal child manifests so the new directories are real workspaces even before they contain production code.

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

```json
{
  "name": "@thesis-progress/mobile",
  "private": true,
  "version": "0.0.0"
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/release/package-scripts.test.ts`
Expected: PASS and no existing release script contract regressions.

**Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json apps/mobile/package.json apps/mobile/tsconfig.json packages/core/package.json packages/data/package.json packages/ui-tokens/package.json tests/release/package-scripts.test.ts
git commit -m "build: add workspace skeleton for mobile expansion"
```

### Task 2: Extract Shared Domain Types And Pure Logic

**Files:**
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/progress.ts`
- Create: `packages/core/src/selectors.ts`
- Modify: `src/renderer/types.ts`
- Modify: `src/main/edit-session-types.ts`
- Modify: `src/main/version-utils.ts`
- Test: `tests/core/progress.test.ts`
- Test: `tests/core/selectors.test.ts`
- Test: `tests/main/version-utils.test.ts`

**Step 1: Write the failing tests**

Add new shared-core tests that lock down the desktop app's existing pure logic before moving any code. Focus on progress calculation, sorting/filtering and shared version utility behavior.

```ts
// tests/core/progress.test.ts
it('computes thesis progress without importing Electron code', () => {
  const result = calculateProgress(sampleThesis)
  expect(result).toEqual(expectedProgress)
})
```

```ts
// tests/core/selectors.test.ts
it('filters and sorts theses from plain domain objects', () => {
  const result = selectVisibleTheses(sampleState, sampleFilters)
  expect(result.map((item) => item.id)).toEqual(['t-2', 't-1'])
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/progress.test.ts tests/core/selectors.test.ts tests/main/version-utils.test.ts`
Expected: FAIL because the shared modules do not exist yet.

**Step 3: Write minimal implementation**

Create `packages/core/src/types.ts` by moving the existing shared domain types out of `src/renderer/types.ts` and `src/main/edit-session-types.ts`, preserving field names verbatim. Move all Electron-free helpers into `progress.ts` and `selectors.ts`, then re-export them from `index.ts`.

```ts
// packages/core/src/index.ts
export * from './types'
export * from './progress'
export * from './selectors'
```

```ts
// packages/core/src/progress.ts
export function calculateProgress(thesis: ThesisRecord): ThesisProgress {
  // Move the current pure progress logic here without Electron imports.
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/progress.test.ts tests/core/selectors.test.ts tests/main/version-utils.test.ts`
Expected: PASS with `src/main/version-utils.ts` and renderer types now importing from `packages/core`.

**Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/src/types.ts packages/core/src/progress.ts packages/core/src/selectors.ts src/renderer/types.ts src/main/edit-session-types.ts src/main/version-utils.ts tests/core/progress.test.ts tests/core/selectors.test.ts tests/main/version-utils.test.ts
git commit -m "refactor: extract shared thesis domain core"
```

### Task 3: Introduce Platform Adapter Interfaces And Desktop Implementations

**Files:**
- Create: `packages/data/src/index.ts`
- Create: `packages/data/src/adapters.ts`
- Create: `packages/data/src/repository.ts`
- Modify: `src/main/split-data-store.ts`
- Modify: `src/main/file-watcher.ts`
- Modify: `src/main/path-resolver.ts`
- Modify: `src/main/ipc-handlers.ts`
- Test: `tests/main/split-data-store.test.ts`
- Test: `tests/main/file-watcher.test.ts`
- Test: `tests/main/ipc-data-path.test.ts`
- Test: `tests/data/desktop-storage-adapter.test.ts`

**Step 1: Write the failing tests**

Add adapter contract tests for the desktop implementation so later mobile work can target the same interface.

```ts
// tests/data/desktop-storage-adapter.test.ts
it('loads, saves and subscribes through the shared storage adapter contract', async () => {
  const adapter = createDesktopStorageAdapter(testPaths)

  await adapter.save(samplePayload)
  expect(await adapter.load()).toEqual(samplePayload)
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/data/desktop-storage-adapter.test.ts tests/main/split-data-store.test.ts tests/main/file-watcher.test.ts tests/main/ipc-data-path.test.ts`
Expected: FAIL because no shared adapter interface exists yet.

**Step 3: Write minimal implementation**

Define explicit interfaces for storage, file picking, lifecycle and updates in `packages/data/src/adapters.ts`, then wrap the existing Electron store and watcher behavior behind a desktop adapter implementation.

```ts
// packages/data/src/adapters.ts
export interface StorageAdapter<T> {
  load(): Promise<T>
  save(next: T): Promise<void>
  subscribe(onChange: (next: T) => void): Promise<() => void>
}
```

```ts
// packages/data/src/index.ts
export * from './adapters'
export * from './repository'
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/data/desktop-storage-adapter.test.ts tests/main/split-data-store.test.ts tests/main/file-watcher.test.ts tests/main/ipc-data-path.test.ts`
Expected: PASS with desktop code calling the adapter layer instead of reaching directly across modules.

**Step 5: Commit**

```bash
git add packages/data/src/index.ts packages/data/src/adapters.ts packages/data/src/repository.ts src/main/split-data-store.ts src/main/file-watcher.ts src/main/path-resolver.ts src/main/ipc-handlers.ts tests/data/desktop-storage-adapter.test.ts tests/main/split-data-store.test.ts tests/main/file-watcher.test.ts tests/main/ipc-data-path.test.ts
git commit -m "refactor: add shared data adapters"
```

### Task 4: Extract Reusable Renderer State And Design Tokens

**Files:**
- Create: `packages/ui-tokens/src/index.css`
- Create: `packages/ui-tokens/src/index.ts`
- Create: `packages/core/src/view-models.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/index.css`
- Modify: `src/renderer/components/Sidebar.tsx`
- Modify: `src/renderer/components/ThesisList.tsx`
- Modify: `src/renderer/components/ThesisListItem.tsx`
- Test: `tests/core/view-models.test.ts`
- Test: `tests/release/settings-ui-contract.test.ts`

**Step 1: Write the failing tests**

Add a shared view-model test that proves list shaping and summary cards can be derived from plain domain state, plus a release-level UI contract test that confirms desktop still renders with the extracted tokens.

```ts
// tests/core/view-models.test.ts
it('maps domain state into list item view models', () => {
  const items = buildThesisListItems(sampleState)
  expect(items[0]).toMatchObject({ id: 't-1', title: 'Paper 1' })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/view-models.test.ts tests/release/settings-ui-contract.test.ts`
Expected: FAIL because shared view-model helpers and token exports do not exist yet.

**Step 3: Write minimal implementation**

Move reusable CSS variables and spacing rules into `packages/ui-tokens/src/index.css`, and move Electron-free list shaping helpers into `packages/core/src/view-models.ts`. Update the renderer to import the token stylesheet and view-model helpers instead of rebuilding the same logic inside components.

```ts
// packages/ui-tokens/src/index.ts
import './index.css'
```

```css
/* packages/ui-tokens/src/index.css */
:root {
  --color-surface: #ffffff;
  --color-border: #d9dde6;
  --space-3: 12px;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/view-models.test.ts tests/release/settings-ui-contract.test.ts`
Expected: PASS and desktop renderer snapshots/contracts stay stable after the extraction.

**Step 5: Commit**

```bash
git add packages/ui-tokens/src/index.css packages/ui-tokens/src/index.ts packages/core/src/view-models.ts src/renderer/App.tsx src/renderer/index.css src/renderer/components/Sidebar.tsx src/renderer/components/ThesisList.tsx src/renderer/components/ThesisListItem.tsx tests/core/view-models.test.ts tests/release/settings-ui-contract.test.ts
git commit -m "refactor: extract shared renderer state and tokens"
```

### Task 5: Scaffold The Mobile Capacitor Shell

**Files:**
- Create: `apps/mobile/capacitor.config.ts`
- Create: `apps/mobile/vite.config.ts`
- Create: `apps/mobile/index.html`
- Create: `apps/mobile/src/main.tsx`
- Create: `apps/mobile/src/App.tsx`
- Create: `apps/mobile/src/screens/ThesisListScreen.tsx`
- Modify: `apps/mobile/package.json`
- Test: `tests/mobile/mobile-shell.test.tsx`

**Step 1: Write the failing test**

Add a smoke test that renders the mobile app with shared mock data and verifies that a thesis list screen can mount without Electron APIs.

```tsx
// tests/mobile/mobile-shell.test.tsx
it('renders the mobile thesis list from shared core data', () => {
  render(<App initialState={sampleState} />)
  expect(screen.getByText('Paper 1')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mobile/mobile-shell.test.tsx`
Expected: FAIL because the mobile app shell does not exist yet.

**Step 3: Write minimal implementation**

Scaffold a Vite-based mobile app that imports from `packages/core` and `packages/ui-tokens`, then layer Capacitor on top.

```ts
// apps/mobile/capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.thesisprogress.mobile',
  appName: 'Thesis Progress Tracker',
  webDir: 'dist'
}

export default config
```

```tsx
// apps/mobile/src/App.tsx
export function App() {
  return <ThesisListScreen />
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/mobile/mobile-shell.test.tsx`
Run: `npm --workspace apps/mobile run build`
Expected: PASS and a production bundle is created without importing Electron modules.

**Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/capacitor.config.ts apps/mobile/vite.config.ts apps/mobile/index.html apps/mobile/src/main.tsx apps/mobile/src/App.tsx apps/mobile/src/screens/ThesisListScreen.tsx tests/mobile/mobile-shell.test.tsx
git commit -m "feat: scaffold mobile capacitor shell"
```

### Task 6: Implement Mobile Storage And Lifecycle Adapters

**Files:**
- Create: `apps/mobile/src/adapters/capacitor-storage.ts`
- Create: `apps/mobile/src/adapters/lifecycle.ts`
- Create: `apps/mobile/src/adapters/file-picker.ts`
- Modify: `apps/mobile/src/App.tsx`
- Modify: `packages/data/src/adapters.ts`
- Test: `tests/mobile/capacitor-storage-contract.test.ts`
- Test: `tests/mobile/lifecycle.test.ts`

**Step 1: Write the failing tests**

Add contract tests that prove the mobile implementation can save, load and restore state using the same shared interface expected by the desktop adapter.

```ts
// tests/mobile/capacitor-storage-contract.test.ts
it('persists thesis data through the mobile storage adapter contract', async () => {
  const adapter = createCapacitorStorageAdapter(fakePreferences)

  await adapter.save(samplePayload)
  expect(await adapter.load()).toEqual(samplePayload)
})
```

```ts
// tests/mobile/lifecycle.test.ts
it('restores draft state after background and resume events', async () => {
  const app = createMobileLifecycleHarness()
  await app.goBackground()
  await app.resume()
  expect(app.restoreDraft).toHaveBeenCalled()
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/mobile/capacitor-storage-contract.test.ts tests/mobile/lifecycle.test.ts`
Expected: FAIL because the mobile adapter implementations do not exist yet.

**Step 3: Write minimal implementation**

Implement Capacitor-backed adapters that satisfy the shared storage and lifecycle contracts, then inject them through the mobile app root.

```ts
// apps/mobile/src/adapters/capacitor-storage.ts
export function createCapacitorStorageAdapter(
  preferences: PreferencesPlugin
): StorageAdapter<SerializedThesisState> {
  return {
    async load() { /* ... */ },
    async save(next) { /* ... */ },
    async subscribe() { return () => {} }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/mobile/capacitor-storage-contract.test.ts tests/mobile/lifecycle.test.ts`
Run: `npm --workspace apps/mobile run build`
Expected: PASS and the mobile app can boot with a real persistence implementation.

**Step 5: Commit**

```bash
git add apps/mobile/src/adapters/capacitor-storage.ts apps/mobile/src/adapters/lifecycle.ts apps/mobile/src/adapters/file-picker.ts apps/mobile/src/App.tsx packages/data/src/adapters.ts tests/mobile/capacitor-storage-contract.test.ts tests/mobile/lifecycle.test.ts
git commit -m "feat: add mobile platform adapters"
```

### Task 7: Move The Desktop App Under `apps/desktop`

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/electron-builder.json`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/vitest.config.ts`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/tsconfig.main.json`
- Move: `src/main/*` to `apps/desktop/src/main/`
- Move: `src/preload/preload.ts` to `apps/desktop/src/preload/preload.ts`
- Move: `src/renderer/*` to `apps/desktop/src/renderer/`
- Modify: `package.json`
- Modify: `.github/workflows/release.yml`
- Test: `tests/release/electron-builder-config.test.ts`
- Test: `tests/release/preload-api-contract.test.ts`
- Test: `tests/release/package-scripts.test.ts`

**Step 1: Write the failing tests**

Extend the release tests so they expect desktop build inputs to resolve from `apps/desktop` rather than the repository root.

```ts
// tests/release/electron-builder-config.test.ts
it('loads desktop release config from the desktop workspace', () => {
  const configPath = resolveRepoPath('apps/desktop/electron-builder.json')
  expect(existsSync(configPath)).toBe(true)
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/release/electron-builder-config.test.ts tests/release/preload-api-contract.test.ts tests/release/package-scripts.test.ts`
Expected: FAIL because the desktop app still lives at the repository root.

**Step 3: Write minimal implementation**

Move the current Electron app files into `apps/desktop`, update imports and path aliases, and change root scripts to delegate to the desktop workspace.

```json
{
  "scripts": {
    "dev": "npm --workspace apps/desktop run dev",
    "build": "npm --workspace apps/desktop run build",
    "test": "npm --workspace apps/desktop run test"
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/release/electron-builder-config.test.ts tests/release/preload-api-contract.test.ts tests/release/package-scripts.test.ts`
Run: `npm --workspace apps/desktop run build`
Expected: PASS and desktop packaging inputs resolve from `apps/desktop`.

**Step 5: Commit**

```bash
git add apps/desktop package.json .github/workflows/release.yml tests/release/electron-builder-config.test.ts tests/release/preload-api-contract.test.ts tests/release/package-scripts.test.ts
git commit -m "refactor: move desktop app into workspace"
```

### Task 8: Finish Docs, CI And Cross-Platform Verification

**Files:**
- Create: `docs/release/mobile-release-checklist.md`
- Modify: `README.md`
- Modify: `.github/workflows/release.yml`
- Modify: `docs/release/windows-github-release.md`
- Modify: `docs/release/windows-release-checklist.md`
- Test: `tests/release/release-docs.test.ts`

**Step 1: Write the failing test**

Update the docs contract test so it expects mobile setup instructions, the new workspace layout and release guidance for both desktop and mobile.

```ts
// tests/release/release-docs.test.ts
it('documents the workspace layout and mobile release flow', () => {
  const readme = readFileSync(resolveRepoPath('README.md'), 'utf8')
  expect(readme).toContain('apps/mobile')
  expect(readme).toContain('packages/core')
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/release/release-docs.test.ts`
Expected: FAIL because the docs do not yet mention the new mobile workflow.

**Step 3: Write minimal implementation**

Document:
- the new workspace structure
- how to run desktop and mobile locally
- how shared packages are consumed
- the release checklist for mobile

Also update CI to run the shared-core tests plus desktop and mobile smoke tests.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/release/release-docs.test.ts`
Run: `npx vitest run tests/core/*.test.ts tests/data/*.test.ts tests/mobile/*.test.ts tests/release/*.test.ts`
Expected: PASS and the repo documentation matches the new architecture.

**Step 5: Commit**

```bash
git add README.md .github/workflows/release.yml docs/release/mobile-release-checklist.md docs/release/windows-github-release.md docs/release/windows-release-checklist.md tests/release/release-docs.test.ts
git commit -m "docs: add mobile workspace and release guidance"
```

## Final Verification Checklist

After all tasks are complete, run the full verification pass before merging:

```bash
npx vitest run
npm --workspace apps/desktop run build
npm --workspace apps/mobile run build
```

Expected results:
- all Vitest suites pass
- desktop build completes from `apps/desktop`
- mobile build completes from `apps/mobile`
- no shared package imports reach into Electron-only modules

## Notes For The Implementer

- Keep the first extraction steps focused on pure logic. Do not start with UI rewrites.
- Prefer moving code verbatim into `packages/core` before changing behavior.
- Do not let `packages/core` or `packages/data` import from `electron`, `src/main`, `src/preload`, or Capacitor plugins.
- Mobile UI does not need to duplicate the desktop layout. Reuse rules and data flow first, then adapt interaction patterns.
- Use small commits exactly as outlined above so regression isolation stays easy.
