import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('settings ui contract', () => {
  it('renders controls for selecting/resetting/opening data directory', () => {
    const source = fs.readFileSync('src/renderer/components/SettingsModal.tsx', 'utf8')
    expect(source).toContain('选择目录')
    expect(source).toContain('恢复默认')
    expect(source).toContain('打开当前目录')
  })
})
