import * as fs from 'fs'
import * as path from 'path'

// ==================== Types ====================

export interface Thesis {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ThesesIndex {
  theses: Thesis[]
}

export interface VersionRecord {
  id: string
  thesisId: string
  version: string
  date: string
  changes?: string
  focus?: string
  filePath?: string   // relative to thesis dir (filename only)
  fileName?: string
  fileType?: string
}

export interface ThesisVersions {
  versions: VersionRecord[]
}

export interface LocalState {
  currentThesisId: string | null
}

// ==================== Helpers ====================

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'untitled'
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ==================== Theses Index ====================

const THESES_INDEX_FILE = 'theses-index.json'

export function loadThesesIndex(dataDir: string): ThesesIndex {
  return readJsonSafe(path.join(dataDir, THESES_INDEX_FILE), { theses: [] })
}

export function saveThesesIndex(dataDir: string, index: ThesesIndex): void {
  writeJson(path.join(dataDir, THESES_INDEX_FILE), index)
}

// ==================== Thesis Versions ====================

const VERSIONS_FILE = 'versions.json'

export function getThesisDir(dataDir: string, thesisTitle: string): string {
  return path.join(dataDir, sanitizeFileName(thesisTitle))
}

export function loadThesisVersions(dataDir: string, thesisTitle: string): ThesisVersions {
  const dir = getThesisDir(dataDir, thesisTitle)
  return readJsonSafe(path.join(dir, VERSIONS_FILE), { versions: [] })
}

export function saveThesisVersions(dataDir: string, thesisTitle: string, data: ThesisVersions): void {
  const dir = getThesisDir(dataDir, thesisTitle)
  writeJson(path.join(dir, VERSIONS_FILE), data)
}

// ==================== Local State ====================

const LOCAL_STATE_FILE = 'local-state.json'

export function loadLocalState(userDataPath: string): LocalState {
  return readJsonSafe(path.join(userDataPath, LOCAL_STATE_FILE), { currentThesisId: null })
}

export function saveLocalState(userDataPath: string, state: LocalState): void {
  writeJson(path.join(userDataPath, LOCAL_STATE_FILE), state)
}

// ==================== Path Helpers ====================

export function resolveVersionFilePath(dataDir: string, thesisTitle: string, relativePath: string): string {
  return path.join(getThesisDir(dataDir, thesisTitle), relativePath)
}

export function toRelativeFilePath(absolutePath: string, thesisDir: string): string {
  return path.relative(thesisDir, absolutePath)
}

// ==================== Merge Helpers ====================

export function mergeThesesIndex(existing: ThesesIndex, incoming: ThesesIndex): ThesesIndex {
  const merged = new Map<string, Thesis>()
  for (const t of existing.theses) merged.set(t.id, t)
  for (const t of incoming.theses) {
    const prev = merged.get(t.id)
    if (!prev || t.updatedAt > prev.updatedAt) {
      merged.set(t.id, t)
    }
  }
  return { theses: Array.from(merged.values()) }
}
