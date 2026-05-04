import { describe, expect, it } from 'vitest'
import * as path from 'path'
import { resolveDataDirCandidates } from '../../src/main/path-resolver'

describe('resolveDataDirCandidates', () => {
  it('uses app directory data as primary and userData data as fallback', () => {
    const result = resolveDataDirCandidates({
      execPath: 'C:/Program Files/Thesis Progress Tracker/Thesis Progress Tracker.exe',
      userDataPath: 'C:/Users/test/AppData/Roaming/Thesis Progress Tracker',
    })

    expect(result.primary).toBe(path.join('C:/Program Files/Thesis Progress Tracker', 'data'))
    expect(result.fallback).toBe(path.join('C:/Users/test/AppData/Roaming/Thesis Progress Tracker', 'data'))
  })
})
