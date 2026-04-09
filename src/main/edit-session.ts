import * as crypto from 'crypto'
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import log from 'electron-log'
import { EditSession, EditSessionParams } from './edit-session-types'
import { isLockFileForTargetFile, supportsAutoArchive } from './version-utils'
import {
  loadThesesIndex,
  saveThesesIndex,
  loadThesisVersions,
  saveThesisVersions,
  getThesisDir,
  VersionRecord,
} from './split-data-store'

let activeSession: EditSession | null = null
let activeWatcher: fs.FSWatcher | null = null
let activePollTimer: NodeJS.Timeout | null = null

export function getActiveSession(): EditSession | null {
  return activeSession
}

/**
 * Create a new edit session: copy file, persist session, return session object.
 * Does NOT open the file or start watching — caller handles that.
 */
export function createEditSession(params: EditSessionParams, dataDir: string, userDataPath: string, thesisTitle?: string): EditSession {
  if (activeSession) {
    throw new Error('已有一个编辑会话正在进行中，请先完成或取消当前编辑。')
  }

  const newVersionId = crypto.randomUUID()
  const ext = path.extname(params.baseFilePath)
  const fileType = ext.slice(1).toUpperCase()
  const autoArchive = supportsAutoArchive(ext.slice(1))

  const sourceFilePath = params.replacementFilePath || params.baseFilePath
  const dirName = thesisTitle
    ? thesisTitle.replace(/[/\\:*?"<>|]/g, '_').trim() || 'untitled'
    : `thesis_${params.thesisId}`
  const thesisFilesDir = path.join(dataDir, dirName)
  if (!fs.existsSync(thesisFilesDir)) {
    fs.mkdirSync(thesisFilesDir, { recursive: true })
  }

  const baseName = path.basename(params.baseFileName, ext)
  const ver = params.versionInfo.version || newVersionId
  const editFileName = `${ver.replace(/[/\\:*?"<>|]/g, '_')}_${baseName.replace(/[/\\:*?"<>|]/g, '_')}${ext}`
  let editFilePath = path.join(thesisFilesDir, editFileName)
  if (fs.existsSync(editFilePath)) {
    let counter = 2
    while (fs.existsSync(editFilePath)) {
      editFilePath = path.join(thesisFilesDir, `${ver.replace(/[/\\:*?"<>|]/g, '_')}_${baseName.replace(/[/\\:*?"<>|]/g, '_')}_${counter}${ext}`)
      counter++
    }
  }
  fs.copyFileSync(sourceFilePath, editFilePath)

  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

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
  }

  activeSession = session
  persistSession(userDataPath, session)
  log.info('Edit session created:', session.newVersionId)

  return session
}

/**
 * Archive the active session: write version to data.json, clean up session.
 * Returns the archived session for notification purposes.
 */
export function archiveSession(dataDir: string, userDataPath: string): EditSession | null {
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
  removePersistedSession(userDataPath)

  return session
}

/**
 * Clear the active session. If deleteFile=true, also delete the copied file.
 */
export function clearSession(userDataPath?: string, deleteFile?: boolean): void {
  if (deleteFile && activeSession && fs.existsSync(activeSession.editFilePath)) {
    try {
      fs.unlinkSync(activeSession.editFilePath)
      log.info('Deleted edit file:', activeSession.editFilePath)
    } catch (e) {
      log.error('Error deleting edit file:', e)
    }
  }

  activeSession = null
  stopWatcher()

  if (userDataPath) {
    removePersistedSession(userDataPath)
  }
}

export function shouldAutoArchiveAfterClose(
  initialModifiedTimeMs: number,
  currentModifiedTimeMs: number,
  isOpen: boolean,
): boolean {
  return currentModifiedTimeMs > initialModifiedTimeMs && !isOpen
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
  const dir = path.dirname(session.editFilePath)
  const initialModifiedTimeMs = getFileModifiedTimeMs(session.editFilePath)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let archiveRequested = false

  const scheduleArchive = () => {
    if (archiveRequested) return
    archiveRequested = true
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const currentModifiedTimeMs = getFileModifiedTimeMs(session.editFilePath)
      const stillOpen = isFileCurrentlyOpen(session.editFilePath)
      if (shouldAutoArchiveAfterClose(initialModifiedTimeMs, currentModifiedTimeMs, stillOpen)) {
        log.info('Edit file closed after modification, auto-archiving')
        onArchive()
        return
      }
      archiveRequested = false
    }, 2000)
  }

  try {
    activeWatcher = fs.watch(dir, (_eventType, filename) => {
      if (!filename) return
      const lockFileName = filename.toString()
      if (!isLockFileForTargetFile(lockFileName, session.editFilePath)) return

      const lockPath = path.join(dir, lockFileName)
      if (!fs.existsSync(lockPath)) {
        log.info('Lock file deleted:', lockFileName)
        scheduleArchive()
      } else if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
        archiveRequested = false
      }
    })

    activeWatcher.on('error', (err) => {
      log.error('Lock file watcher error:', err)
      stopWatcher()
      onError()
    })

    log.info('Started lock file watch for session:', session.newVersionId)

    if (process.platform === 'darwin') {
      activePollTimer = setInterval(() => {
        const currentModifiedTimeMs = getFileModifiedTimeMs(session.editFilePath)
        const stillOpen = isFileCurrentlyOpen(session.editFilePath)
        if (shouldAutoArchiveAfterClose(initialModifiedTimeMs, currentModifiedTimeMs, stillOpen)) {
          log.info('Detected modified file closed without lock file, auto-archiving')
          scheduleArchive()
        }
      }, 2000)
    }
  } catch (err) {
    log.error('Failed to start lock file watch:', err)
    onError()
  }
}

export function stopWatcher(): void {
  if (activeWatcher) {
    activeWatcher.close()
    activeWatcher = null
  }
  if (activePollTimer) {
    clearInterval(activePollTimer)
    activePollTimer = null
  }
}

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

function getFileModifiedTimeMs(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs
  } catch {
    return 0
  }
}

function isFileCurrentlyOpen(filePath: string): boolean {
  try {
    const output = execFileSync('lsof', ['-t', filePath], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()
    return output.length > 0
  } catch {
    return false
  }
}
