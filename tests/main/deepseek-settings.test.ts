import { describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  clearDeepSeekApiKey,
  getDeepSeekSettingsPath,
  loadDeepSeekApiKey,
  saveDeepSeekApiKey,
} from '../../src/main/deepseek-settings'

describe('deepseek settings', () => {
  it('stores api key under userData and not data dir', () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-settings-'))
    const settingsPath = getDeepSeekSettingsPath(userData)

    expect(settingsPath).toBe(path.join(userData, 'deepseek-settings.json'))

    fs.rmSync(userData, { recursive: true, force: true })
  })

  it('round-trips api key', () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-settings-'))

    saveDeepSeekApiKey(userData, 'sk-test')

    expect(loadDeepSeekApiKey(userData)).toBe('sk-test')

    fs.rmSync(userData, { recursive: true, force: true })
  })

  it('clears api key', () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'deepseek-settings-'))

    saveDeepSeekApiKey(userData, 'sk-test')
    clearDeepSeekApiKey(userData)

    expect(loadDeepSeekApiKey(userData)).toBeNull()

    fs.rmSync(userData, { recursive: true, force: true })
  })
})
