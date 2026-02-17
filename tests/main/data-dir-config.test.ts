import { describe, expect, it } from 'vitest'
import { resolveDataDirStatus } from '../../src/main/data-dir-config'

describe('resolveDataDirStatus', () => {
  it('prefers custom directory when writable', () => {
    const status = resolveDataDirStatus({
      customDir: 'D:/custom-data',
      appDefaultDir: 'C:/Program Files/App/data',
      fallbackUserDir: 'C:/Users/u/AppData/Roaming/App/data',
      canWrite: (target) => target === 'D:/custom-data',
    })

    expect(status.effectivePath).toBe('D:/custom-data')
    expect(status.source).toBe('custom')
    expect(status.fallbackMessage).toBeUndefined()
  })

  it('falls back to user dir when app dir is not writable', () => {
    const status = resolveDataDirStatus({
      customDir: undefined,
      appDefaultDir: 'C:/Program Files/App/data',
      fallbackUserDir: 'C:/Users/u/AppData/Roaming/App/data',
      canWrite: (target) => target !== 'C:/Program Files/App/data',
    })

    expect(status.effectivePath).toBe('C:/Users/u/AppData/Roaming/App/data')
    expect(status.source).toBe('fallback')
    expect(status.fallbackMessage).toContain('fallback')
  })
})
