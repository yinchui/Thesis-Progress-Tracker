import * as fs from 'fs'
import * as path from 'path'
import {
  saveThesesIndex,
  saveThesisVersions,
  saveLocalState,
  getThesisDir,
  Thesis,
  VersionRecord,
} from './split-data-store'

interface OldAppData {
  theses: Thesis[]
  currentThesisId: string | null
  versions: Array<VersionRecord & { filePath?: string }>
}

export function needsMigration(dataDir: string): boolean {
  return fs.existsSync(path.join(dataDir, 'data.json'))
}

export function migrateToSplitFormat(dataDir: string, userDataPath: string): boolean {
  const dataJsonPath = path.join(dataDir, 'data.json')

  if (!fs.existsSync(dataJsonPath)) {
    return true
  }

  try {
    const raw = fs.readFileSync(dataJsonPath, 'utf-8')
    const oldData: OldAppData = JSON.parse(raw)

    // 1. Write theses-index.json
    saveThesesIndex(dataDir, { theses: oldData.theses || [] })

    // 2. For each thesis, write versions.json and move files
    for (const thesis of (oldData.theses || [])) {
      const thesisVersions = (oldData.versions || []).filter(v => v.thesisId === thesis.id)
      const newThesisDir = getThesisDir(dataDir, thesis.title)

      if (!fs.existsSync(newThesisDir)) {
        fs.mkdirSync(newThesisDir, { recursive: true })
      }

      const migratedVersions: VersionRecord[] = thesisVersions.map(v => {
        const newVersion = { ...v }

        if (v.filePath && fs.existsSync(v.filePath)) {
          const fileName = path.basename(v.filePath)
          const newFilePath = path.join(newThesisDir, fileName)

          if (!fs.existsSync(newFilePath)) {
            try {
              fs.copyFileSync(v.filePath, newFilePath)
            } catch (e) {
              console.error('Error copying file during migration:', e)
            }
          }

          newVersion.filePath = fileName
        } else if (v.filePath) {
          newVersion.filePath = path.basename(v.filePath)
        }

        return newVersion
      })

      saveThesisVersions(dataDir, thesis.title, { versions: migratedVersions })
    }

    // 3. Save local state
    saveLocalState(userDataPath, { currentThesisId: oldData.currentThesisId || null })

    // 4. Rename old data.json to backup
    fs.renameSync(dataJsonPath, dataJsonPath + '.backup')

    // 5. Clean up old files/ directory
    const oldFilesDir = path.join(dataDir, 'files')
    if (fs.existsSync(oldFilesDir)) {
      try {
        fs.rmSync(oldFilesDir, { recursive: true, force: true })
      } catch {
        // keep if removal fails
      }
    }

    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}
