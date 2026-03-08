import * as path from 'path'

/**
 * Increment the last number in a version string.
 * "v1.0" → "v1.1", "v2" → "v3", "第一稿" → "第一稿"
 */
export function incrementVersion(version: string): string {
  const match = version.match(/^(.*?)(\d+)(\D*)$/)
  if (!match) return version
  const [, prefix, num, suffix] = match
  return `${prefix}${parseInt(num, 10) + 1}${suffix}`
}

const AUTO_ARCHIVE_EXTENSIONS = new Set(['doc', 'docx'])

/**
 * Check if a file extension supports auto-archive (lock file detection).
 */
export function supportsAutoArchive(ext: string): boolean {
  return AUTO_ARCHIVE_EXTENSIONS.has(ext.toLowerCase())
}

/**
 * Get the expected lock file path for a given file.
 * Word/WPS create ~$filename.docx when editing.
 * Returns null for unsupported file types.
 */
export function getLockFilePath(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  if (!supportsAutoArchive(ext)) return null
  const dir = path.dirname(filePath)
  const basename = path.basename(filePath)
  return path.join(dir, `~$${basename}`)
}
