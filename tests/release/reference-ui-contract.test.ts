import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('reference UI contract', () => {
  it('provides an add-reference modal with required fields', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceModal.tsx', 'utf8')
    expect(source).toContain('新增参考文献')
    expect(source).toContain('标题')
    expect(source).toContain('作者')
    expect(source).toContain('年份')
    expect(source).toContain('onSubmit')
  })

  it('provides a collapsible reference section', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceSection.tsx', 'utf8')
    expect(source).toContain('ReferenceModal')
    expect(source).toContain('参考文献')
    expect(source).toContain('暂无参考文献')
    expect(source).toContain('新增参考文献')
    expect(source).toContain('confirm')
  })
})
