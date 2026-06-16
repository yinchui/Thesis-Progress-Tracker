import * as fs from 'fs'
import * as path from 'path'

interface DeepSeekSettings {
  apiKey?: string
}

export function getDeepSeekSettingsPath(userDataPath: string): string {
  return path.join(userDataPath, 'deepseek-settings.json')
}

function loadSettings(userDataPath: string): DeepSeekSettings {
  try {
    const filePath = getDeepSeekSettingsPath(userDataPath)
    if (!fs.existsSync(filePath)) return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as DeepSeekSettings
  } catch {
    return {}
  }
}

function saveSettings(userDataPath: string, settings: DeepSeekSettings): void {
  fs.mkdirSync(userDataPath, { recursive: true })
  fs.writeFileSync(
    getDeepSeekSettingsPath(userDataPath),
    JSON.stringify(settings, null, 2),
    'utf8'
  )
}

export function loadDeepSeekApiKey(userDataPath: string): string | null {
  return loadSettings(userDataPath).apiKey || null
}

export function saveDeepSeekApiKey(userDataPath: string, apiKey: string): void {
  const trimmed = apiKey.trim()
  if (!trimmed) throw new Error('DeepSeek API key 不能为空')
  saveSettings(userDataPath, { ...loadSettings(userDataPath), apiKey: trimmed })
}

export function clearDeepSeekApiKey(userDataPath: string): void {
  const settings = loadSettings(userDataPath)
  delete settings.apiKey
  saveSettings(userDataPath, settings)
}
