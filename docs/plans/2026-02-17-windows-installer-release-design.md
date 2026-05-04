# Windows Installer Release Design

Date: 2026-02-17
Status: Approved
Scope: `thesis-tracker` current repository

## 1. Goal

Ship a directly installable Windows release for this project and publish it from the current GitHub repository.

## 2. Requirements

1. Output must be a Windows installer package (`NSIS`, x64).
2. First release can be unsigned.
3. Release artifact must be published in GitHub Releases.
4. Keep a clean path for adding code signing later without redesigning the pipeline.

## 3. Approach Options (Reviewed)

1. Fast path: package and publish manually.
2. Stable path: package and publish manually, plus release quality gates.
3. Full engineering path: CI/CD and automated release from day one.

Selected: Option 2 (stable path), then evolve to option 3.

## 4. Design

### 4.1 Architecture and Packaging Structure

1. Keep current build structure (`dist/main`, `dist/preload`, `dist/renderer`).
2. Switch installer target to Windows `nsis` (`x64`) as default release output.
3. Remove runtime dependency on hard-coded local path (`E:\\...\\data`).
4. Store app data under OS user directory (`app.getPath('userData')`-based path) so installer output runs on any machine.
5. Do not rely on development `data/` folder for production runtime behavior.

### 4.2 Config and Commands

1. `electron-builder` config:
   - `win.target`: `nsis`
   - `arch`: `x64`
   - `artifactName`: `${productName}-Setup-${version}.${ext}`
   - Keep `nsis` installer options (shortcut creation, install dir choice)
2. `package.json` scripts:
   - `build` (renderer + main)
   - `dist:win` (`electron-builder --win nsis --x64`)
   - `release:local` (`npm run build && npm run dist:win`)
3. Keep one output directory for final artifacts (recommended: `release/`).
4. Versioning: update `package.json` version and use matching git tag (`vX.Y.Z`).

### 4.3 GitHub Release Flow

Phase A (now): Manual release
1. Run local release command.
2. Create GitHub Release with tag `vX.Y.Z`.
3. Upload installer `.exe` to the Release.
4. Publish release notes and include "unsigned build" notice.

Phase B (later): Automated release
1. Add GitHub Actions workflow triggered by tags (`v*`).
2. Build Windows installer and upload artifact to GitHub Releases automatically.
3. Add code-signing secrets later without changing release structure.

### 4.4 Quality Gates and Definition of Done

Pre-release gates:
1. `npm ci` passes.
2. `npm run build` passes.
3. `npm run dist:win` produces NSIS installer.
4. Installer can install, launch, and uninstall on Windows.
5. Core flow passes smoke test:
   - create thesis
   - add version
   - edit/delete
   - open file
6. Data persists after app restart in user-level data directory.
7. Git tag matches app version.
8. GitHub Release asset is downloadable and installable.

Definition of Done:
1. Repository has reproducible release commands.
2. GitHub Releases contains installable Windows `.exe`.
3. Release notes include known limitation: unsigned binary (for initial release).

## 5. Risks and Mitigations

1. Windows symlink extraction failure during `electron-builder` dependency download.
   - Mitigation: run shell/terminal with proper privileges or enable Developer Mode as required by local environment.
2. Hard-coded data path breaks on target machines.
   - Mitigation: migrate to `app.getPath('userData')`.
3. Unsigned installer shows security warning.
   - Mitigation: publish note now; add signing in later phase.

## 6. Next Step

Create a concrete implementation plan (task breakdown, file-level edits, verification checklist) using the `writing-plans` workflow.
