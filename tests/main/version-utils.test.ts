import { describe, expect, it } from 'vitest'
import { incrementVersion } from '../../src/main/version-utils'

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
