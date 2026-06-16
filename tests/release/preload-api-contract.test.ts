import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('preload api contract', () => {
  it('includes resetDataDir and openDataDir methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('resetDataDir')
    expect(source).toContain('openDataDir')
  })

  it('includes edit session methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('startEditSession')
    expect(source).toContain('cancelEditSession')
    expect(source).toContain('finishEditSession')
    expect(source).toContain('onEditSessionFinished')
    expect(source).toContain('removeEditSessionListener')
    expect(source).toContain('getPendingEditSession')
    expect(source).toContain('resolvePendingEditSession')
    expect(source).toContain('onEditSessionWatchError')
  })

  it('includes reference management methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('getReferences')
    expect(source).toContain('addReference')
    expect(source).toContain('deleteReference')
    expect(source).toContain('get-references')
    expect(source).toContain('add-reference')
    expect(source).toContain('delete-reference')
  })

  it('includes reference sync listener methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('onSyncReferencesUpdated')
    expect(source).toContain('sync-references-updated')
  })
})
