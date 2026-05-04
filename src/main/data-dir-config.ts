import * as fs from 'fs'
import * as path from 'path'
import { resolveDataDirCandidates } from './path-resolver'

export type DataDirSource = 'custom' | 'app' | 'fallback'

export interface DataDirStatus {
  effectivePath: string
  source: DataDirSource
  fallbackMessage?: string
}

export interface ResolveDataDirStatusInput {
  customDir?: string
  appDefaultDir: string
  fallbackUserDir: string
  canWrite: (target: string) => boolean
}

interface DataDirConfigFile {
  customDir?: string
}

export interface RuntimeResolutionInput {
  execPath: string
  userDataPath: string
  configFilePath: string
}

export function resolveDataDirStatus(input: ResolveDataDirStatusInput): DataDirStatus {
  const customDir = input.customDir?.trim()

  if (customDir && input.canWrite(customDir)) {
    return {
      effectivePath: customDir,
      source: 'custom',
    }
  }

  if (input.canWrite(input.appDefaultDir)) {
    return {
      effectivePath: input.appDefaultDir,
      source: 'app',
    }
  }

  return {
    effectivePath: input.fallbackUserDir,
    source: 'fallback',
    fallbackMessage: 'fallback to user data directory because app directory is not writable',
  }
}

export function ensureWritableDir(target: string): boolean {
  try {
    fs.mkdirSync(target, { recursive: true })
    const writeTest = path.join(target, `.write-test-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    fs.writeFileSync(writeTest, 'ok', 'utf-8')
    fs.unlinkSync(writeTest)
    return true
  } catch {
    return false
  }
}

function readConfig(configFilePath: string): DataDirConfigFile {
  try {
    if (!fs.existsSync(configFilePath)) {
      return {}
    }
    const raw = fs.readFileSync(configFilePath, 'utf-8')
    const parsed = JSON.parse(raw) as DataDirConfigFile
    return parsed ?? {}
  } catch {
    return {}
  }
}

function writeConfig(configFilePath: string, config: DataDirConfigFile): void {
  const dir = path.dirname(configFilePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), 'utf-8')
}

export function resolveRuntimeDataDirStatus(input: RuntimeResolutionInput): DataDirStatus {
  const config = readConfig(input.configFilePath)
  const candidates = resolveDataDirCandidates({
    execPath: input.execPath,
    userDataPath: input.userDataPath,
  })

  return resolveDataDirStatus({
    customDir: config.customDir,
    appDefaultDir: candidates.primary,
    fallbackUserDir: candidates.fallback,
    canWrite: ensureWritableDir,
  })
}

export function migrateDataFiles(oldPath: string, newPath: string): boolean {
  try {
    if (path.resolve(oldPath) === path.resolve(newPath)) {
      return true
    }

    if (!fs.existsSync(oldPath)) {
      return true
    }

    let migratedCount = 0

    const oldDataFile = path.join(oldPath, 'data.json')
    const newDataFile = path.join(newPath, 'data.json')
    if (fs.existsSync(oldDataFile) && !fs.existsSync(newDataFile)) {
      fs.copyFileSync(oldDataFile, newDataFile)
      migratedCount++
    }

    const oldFilesDir = path.join(oldPath, 'files')
    const newFilesDir = path.join(newPath, 'files')
    if (fs.existsSync(oldFilesDir)) {
      copyDirRecursive(oldFilesDir, newFilesDir)
      migratedCount++
    }

    for (const fileName of ['edit-session.json', 'edit-session-lock']) {
      const oldFile = path.join(oldPath, fileName)
      const newFile = path.join(newPath, fileName)
      if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
        fs.copyFileSync(oldFile, newFile)
        migratedCount++
      }
    }

    console.log(`Data migration completed: ${migratedCount} items migrated from ${oldPath} to ${newPath}`)
    return true
  } catch (error) {
    console.error('Data migration failed:', error)
    return false
  }
}

export function setCustomDataDir(input: RuntimeResolutionInput, selectedDir: string): DataDirStatus {
  const normalized = path.resolve(selectedDir)
  if (!ensureWritableDir(normalized)) {
    throw new Error('Selected directory is not writable')
  }

  const oldStatus = resolveRuntimeDataDirStatus(input)
  const oldPath = oldStatus.effectivePath

  writeConfig(input.configFilePath, { customDir: normalized })
  const newStatus = resolveRuntimeDataDirStatus(input)

  migrateDataFiles(oldPath, newStatus.effectivePath)

  return newStatus
}

export function resetCustomDataDir(input: RuntimeResolutionInput): DataDirStatus {
  writeConfig(input.configFilePath, {})
  return resolveRuntimeDataDirStatus(input)
}

function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
      continue
    }

    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
