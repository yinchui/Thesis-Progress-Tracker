import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import log from 'electron-log'
import { EditSession, EditSessionParams } from './edit-session-types'
import { isLockFileForTargetFile, supportsAutoArchive } from './version-utils'

let activeSession: EditSession | null = null
let activeWatcher: fs.FSWatcher | null = null

export function getActiveSession(): EditSession | null {
  return activeSession
}

/**
 * Create a new edit session: copy file, persist session, return session object.
 * Does NOT open the file or start watching — caller handles that.
 */
export function createEditSession(params: EditSessionParams, dataDir: string): EditSession {
  if (activeSession) {
    throw new Error('已有一个编辑会话正在进行中，请先完成或取消当前编辑。')
  }

  const newVersionId = crypto.randomUUID()
  const ext = path.extname(params.baseFilePath)
  const fileType = ext.slice(1).toUpperCase()
  const autoArchive = supportsAutoArchive(ext.slice(1))

  const sourceFilePath = params.replacementFilePath || params.baseFilePath
  const thesisFilesDir = path.join(dataDir, 'files', `thesis_${params.thesisId}`)
  if (!fs.existsSync(thesisFilesDir)) {
    fs.mkdirSync(thesisFilesDir, { recursive: true })
  }

  const editFileName = `version_${newVersionId}${ext}`
  const editFilePath = path.join(thesisFilesDir, editFileName)
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
  persistSession(dataDir, session)
  log.info('Edit session created:', session.newVersionId)

  return session
}

/**
 * Archive the active session: write version to data.json, clean up session.
 * Returns the archived session for notification purposes.
 */
export function archiveSession(dataDir: string): EditSession | null {
  if (!activeSession) {
    log.warn('No active session to archive')
    return null
  }

  const session = { ...activeSession }
  const dataFilePath = path.join(dataDir, 'data.json')

  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8')
    const data = JSON.parse(raw)

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
    }

    data.versions.unshift(newVersion)

    const thesisIndex = data.theses.findIndex((t: any) => t.id === session.thesisId)
    if (thesisIndex !== -1) {
      data.theses[thesisIndex].updatedAt = new Date().toISOString()
    }

    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8')
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

/**
 * Clear the active session. If deleteFile=true, also delete the copied file.
 */
export function clearSession(dataDir?: string, deleteFile?: boolean): void {
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

  if (dataDir) {
    removePersistedSession(dataDir)
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
  const dir = path.dirname(session.editFilePath)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  try {
    activeWatcher = fs.watch(dir, (_eventType, filename) => {
      if (!filename) return
      const lockFileName = filename.toString()
      if (!isLockFileForTargetFile(lockFileName, session.editFilePath)) return

      const lockPath = path.join(dir, lockFileName)
      if (!fs.existsSync(lockPath)) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          if (!fs.existsSync(lockPath)) {
            log.info('Lock file deleted, auto-archiving')
            onArchive()
          }
        }, 2000)
      } else if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
    })

    activeWatcher.on('error', (err) => {
      log.error('Lock file watcher error:', err)
      stopWatcher()
      onError()
    })

    log.info('Started lock file watch for session:', session.newVersionId)
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
}

function persistSession(dataDir: string, session: EditSession): void {
  const filePath = path.join(dataDir, 'edit-session.json')
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8')
}

function removePersistedSession(dataDir: string): void {
  const filePath = path.join(dataDir, 'edit-session.json')
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath)
    } catch (e) {
      log.error('Error removing persisted session:', e)
    }
  }
}

export function loadPersistedSession(dataDir: string): EditSession | null {
  const filePath = path.join(dataDir, 'edit-session.json')
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
