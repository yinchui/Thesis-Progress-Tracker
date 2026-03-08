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
