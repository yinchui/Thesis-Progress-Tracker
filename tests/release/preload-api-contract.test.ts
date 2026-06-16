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
    expect(source).toContain('getReferenceData')
    expect(source).toContain('addReference')
    expect(source).toContain('deleteReference')
    expect(source).toContain('selectReferenceFile')
    expect(source).toContain('importReferenceFile')
    expect(source).toContain('deleteReferenceFile')
    expect(source).toContain('saveRecognizedReferences')
    expect(source).toContain('get-references')
    expect(source).toContain('get-reference-data')
    expect(source).toContain('add-reference')
    expect(source).toContain('delete-reference')
    expect(source).toContain('select-reference-file')
    expect(source).toContain('import-reference-file')
    expect(source).toContain('delete-reference-file')
    expect(source).toContain('save-recognized-references')
  })

  it('includes local DeepSeek key methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('getDeepSeekApiKeyStatus')
    expect(source).toContain('saveDeepSeekApiKey')
    expect(source).toContain('clearDeepSeekApiKey')
    expect(source).toContain('get-deepseek-api-key-status')
    expect(source).toContain('save-deepseek-api-key')
    expect(source).toContain('clear-deepseek-api-key')
  })

  it('includes reference sync listener methods', () => {
    const source = fs.readFileSync('src/preload/preload.ts', 'utf8')
    expect(source).toContain('onSyncReferencesUpdated')
    expect(source).toContain('sync-references-updated')
  })
})
