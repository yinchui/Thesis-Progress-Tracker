# Data Directory Configuration and Fallback Design

Date: 2026-02-17  
Status: Approved  
Project: Thesis Progress Tracker

## 1. Goal

Allow users to configure data storage directory manually.  
Default behavior: prefer `data` under app installation directory.  
If app directory is not writable, automatically fallback to user directory and notify user.

## 2. Selected Approach

Chosen approach: **Full settings page/dialog implementation** (Option 2).

## 3. Architecture

### 3.1 Directory Resolution Priority

At runtime, resolve effective data directory with this priority:

1. User custom directory (persisted setting)
2. App directory `data` folder: `path.join(path.dirname(process.execPath), 'data')`
3. Fallback user directory: `path.join(app.getPath('userData'), 'data')`

If directory creation/write test fails, continue to next fallback target.

### 3.2 Persistence

Store data-dir configuration in:

`path.join(app.getPath('userData'), 'data-dir-config.json')`

Config stores only explicit user-selected directory.  
Auto-fallback result is runtime state, not persisted as custom path.

### 3.3 Fallback Notification

When fallback occurs (e.g., app directory is not writable), expose fallback reason to renderer once and show a warning hint in settings UI.

## 4. UI/UX Design

### 4.1 Entry

Reuse sidebar storage button as settings entry point.

### 4.2 Settings Content

Settings dialog shows:

1. Effective current path (read-only)
2. Path source label:
   - User custom
   - App directory default
   - User directory fallback
3. Actions:
   - Select directory
   - Reset to default strategy
   - Open current directory

### 4.3 Interaction

1. Select directory: open folder picker, validate writable, save and apply immediately.
2. Reset default: clear custom setting, re-resolve directory by priority.
3. Open directory: open current path in system file explorer.
4. If fallback happened on current run: show one-time warning banner.

## 5. IPC and Error Handling

### 5.1 IPC Changes

1. `get-data-dir` returns structured status:
   - effectivePath
   - source
   - fallbackMessage (optional)
2. `select-data-dir`:
   - open folder picker
   - writable validation
   - persist custom path
   - return updated status
3. `reset-data-dir`:
   - clear custom path
   - re-resolve and return status
4. `open-data-dir`:
   - open effective path via shell

### 5.2 Migration Strategy

Default: **no automatic data migration** to avoid accidental data loss.  
Optional action in settings: manually migrate existing data to new directory (copy with rollback on error).

### 5.3 Validation and Failures

1. Selected path not writable: reject and prompt user.
2. App directory not writable: auto-fallback and show warning.
3. Migration failure: keep original data untouched, report error.

## 6. Testing and Acceptance

### 6.1 Pre-Release Gates

1. `npm run test` passes
2. `npm run build` passes
3. `npm run release:local` builds NSIS installer

### 6.2 Functional Acceptance

1. First start tries app-dir `data`
2. Non-writable app-dir falls back to `userData/data` with warning
3. Settings can:
   - choose path
   - reset default
   - open current directory
4. After path change, new data writes to selected directory correctly

### 6.3 Release Acceptance

1. Version bump + tag
2. GitHub Release created
3. Installer `.exe` uploaded as release asset
4. Release note includes data-dir behavior and fallback policy
