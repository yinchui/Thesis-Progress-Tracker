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
  // Find last separator and preserve its style (supports both / and \)
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  if (lastSlash === -1) return `~$${filePath}`
  const dir = filePath.slice(0, lastSlash)
  const basename = filePath.slice(lastSlash + 1)
  const sep = filePath[lastSlash]
  return `${dir}${sep}~$${basename}`
}

/**
 * Check whether a lock file name belongs to the given target file.
 * On macOS Word, the lock file can be "~$" + full basename, or "~$" + a basename suffix.
 */
export function isLockFileForTargetFile(lockFileName: string, targetFilePath: string): boolean {
  if (!lockFileName.startsWith('~$')) return false
  const basename = path.basename(targetFilePath)
  const lockSuffix = lockFileName.slice(2)
  return basename.endsWith(lockSuffix)
}
