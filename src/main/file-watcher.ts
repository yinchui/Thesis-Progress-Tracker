import * as path from 'path'
import chokidar from 'chokidar'
import log from 'electron-log'

export interface FileWatcherCallbacks {
  onThesesIndexChanged: () => void
  onVersionsChanged: (thesisDirName: string) => void
  onConflictDetected: (filePath: string) => void
}

export interface FileWatcher {
  start(): void
  stop(): void
  setSilent(durationMs: number): void
}

const CONFLICT_PATTERNS = ['冲突副本', 'SyncConflict', 'conflicted copy']
const DEBOUNCE_MS = 500

function isConflictFile(fileName: string): boolean {
  return CONFLICT_PATTERNS.some(p => fileName.includes(p))
}

export function createFileWatcher(dataDir: string, callbacks: FileWatcherCallbacks): FileWatcher {
  let watcher: chokidar.FSWatcher | null = null
  let silentUntil = 0
  const debounceTimers = new Map<string, NodeJS.Timeout>()

  function isSilent(): boolean {
    return Date.now() < silentUntil
  }

  function debounce(key: string, fn: () => void): void {
    const existing = debounceTimers.get(key)
    if (existing) clearTimeout(existing)
    debounceTimers.set(key, setTimeout(() => {
      debounceTimers.delete(key)
      if (!isSilent()) {
        fn()
      }
    }, DEBOUNCE_MS))
  }

  function handleChange(filePath: string): void {
    const relativePath = path.relative(dataDir, filePath)
    const fileName = path.basename(filePath)
    const parts = relativePath.split(path.sep)

    // Check for conflict files
    if (isConflictFile(fileName)) {
      debounce(`conflict:${filePath}`, () => {
        log.info('Sync conflict detected:', filePath)
        callbacks.onConflictDetected(filePath)
      })
      return
    }

    // theses-index.json at root level
    if (parts.length === 1 && fileName === 'theses-index.json') {
      debounce('theses-index', () => {
        log.info('Theses index changed externally')
        callbacks.onThesesIndexChanged()
      })
      return
    }

    // <thesis-dir>/versions.json
    if (parts.length === 2 && fileName === 'versions.json') {
      const thesisDirName = parts[0]
      debounce(`versions:${thesisDirName}`, () => {
        log.info('Versions changed externally for:', thesisDirName)
        callbacks.onVersionsChanged(thesisDirName)
      })
      return
    }
  }

  return {
    start() {
      watcher = chokidar.watch(dataDir, {
        ignoreInitial: true,
        depth: 2,
        ignored: [
          /(^|[\/\\])\../,
          /\.(pdf|docx?|txt)$/i,
          /data\.json\.backup$/,
        ],
      })

      watcher.on('add', handleChange)
      watcher.on('change', handleChange)
      watcher.on('error', (err) => {
        log.error('File watcher error:', err)
      })

      log.info('File watcher started on:', dataDir)
    },

    stop() {
      if (watcher) {
        watcher.close()
        watcher = null
      }
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer)
      }
      debounceTimers.clear()
      log.info('File watcher stopped')
    },

    setSilent(durationMs: number) {
      silentUntil = Date.now() + durationMs
    },
  }
}
