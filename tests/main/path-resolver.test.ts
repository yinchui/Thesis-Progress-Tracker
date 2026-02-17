import { describe, expect, it } from 'vitest'
import * as path from 'path'
import { resolveDataDir } from '../../src/main/path-resolver'

describe('resolveDataDir', () => {
  it('stores app data under Electron userData path', () => {
    const fakeGetPath = (name: string) =>
      name === 'userData' ? 'C:/Users/test/AppData/Roaming/thesis-tracker' : ''
    const dir = resolveDataDir(fakeGetPath)
    expect(dir).toBe(path.join('C:/Users/test/AppData/Roaming/thesis-tracker', 'data'))
  })
})
