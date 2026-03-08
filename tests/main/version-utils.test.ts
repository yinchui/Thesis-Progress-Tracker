import { describe, expect, it } from 'vitest'
import {
  incrementVersion,
  getLockFilePath,
  supportsAutoArchive,
} from '../../src/main/version-utils'

describe('incrementVersion', () => {
  it('increments last number in v1.0', () => {
    expect(incrementVersion('v1.0')).toBe('v1.1')
  })

  it('increments v1.9 to v1.10', () => {
    expect(incrementVersion('v1.9')).toBe('v1.10')
  })

  it('increments v2 to v3', () => {
    expect(incrementVersion('v2')).toBe('v3')
  })

  it('returns original when no number found', () => {
    expect(incrementVersion('第一稿')).toBe('第一稿')
  })

  it('increments only the last number in v1.2.3', () => {
    expect(incrementVersion('v1.2.3')).toBe('v1.2.4')
  })

  it('handles empty string', () => {
    expect(incrementVersion('')).toBe('')
  })
})

describe('getLockFilePath', () => {
  it('returns ~$ prefixed path for docx', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.docx'))
      .toBe('/data/files/thesis_1/~$version_abc.docx')
  })

  it('returns ~$ prefixed path for doc', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.doc'))
      .toBe('/data/files/thesis_1/~$version_abc.doc')
  })

  it('returns null for txt', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.txt')).toBeNull()
  })

  it('returns null for pdf', () => {
    expect(getLockFilePath('/data/files/thesis_1/version_abc.pdf')).toBeNull()
  })
})

describe('supportsAutoArchive', () => {
  it('returns true for doc', () => {
    expect(supportsAutoArchive('doc')).toBe(true)
  })

  it('returns true for docx', () => {
    expect(supportsAutoArchive('docx')).toBe(true)
  })

  it('returns true for DOC (case insensitive)', () => {
    expect(supportsAutoArchive('DOC')).toBe(true)
  })

  it('returns false for txt', () => {
    expect(supportsAutoArchive('txt')).toBe(false)
  })

  it('returns false for pdf', () => {
    expect(supportsAutoArchive('pdf')).toBe(false)
  })
})
