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

  it('Timeline integrates ReferenceSection', () => {
    const source = fs.readFileSync('src/renderer/components/Timeline.tsx', 'utf8')
    expect(source).toContain('ReferenceSection')
    expect(source).toContain('key={thesisTitle')
    expect(source).toContain('references')
    expect(source).toContain('onAddReference')
    expect(source).toContain('onDeleteReference')
  })

  it('App manages reference state and handlers', () => {
    const source = fs.readFileSync('src/renderer/App.tsx', 'utf8')
    expect(source).toContain('references')
    expect(source).toContain('loadReferences')
    expect(source).toContain('handleAddReference')
    expect(source).toContain('handleDeleteReference')
    expect(source).toContain('getReferences')
    expect(source).toContain('addReference')
    expect(source).toContain('deleteReference')
    expect(source).toContain('useRef')
    expect(source).toContain('currentThesisIdRef')
    expect(source).toContain('onSyncReferencesUpdated')
    expect(source).toContain('const deleted = await window.electronAPI.deleteThesis')
  })
})
