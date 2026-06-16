import { describe, expect, it } from 'vitest'
import fs from 'fs'

describe('reference UI contract', () => {
  it('reference section exposes file upload instead of manual add copy', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceSection.tsx', 'utf8')
    expect(source).toContain('上传参考文献文件')
    expect(source).toContain('referenceFiles')
    expect(source).toContain('onUploadReferenceFile')
    expect(source).not.toContain('新增参考文献')
  })

  it('includes a DeepSeek key modal for local API key setup', () => {
    const source = fs.readFileSync('src/renderer/components/DeepSeekKeyModal.tsx', 'utf8')
    expect(source).toContain('DeepSeek API key')
    expect(source).toContain('saveDeepSeekApiKey')
    expect(source).toContain('本机')
  })

  it('includes an editable recognition confirmation modal', () => {
    const source = fs.readFileSync('src/renderer/components/ReferenceRecognitionModal.tsx', 'utf8')
    expect(source).toContain('识别结果')
    expect(source).toContain('onConfirm')
    expect(source).toContain('title')
    expect(source).toContain('authors')
    expect(source).toContain('year')
  })

  it('Timeline integrates ReferenceSection upload props', () => {
    const source = fs.readFileSync('src/renderer/components/Timeline.tsx', 'utf8')
    expect(source).toContain('ReferenceSection')
    expect(source).toContain('key={thesisTitle')
    expect(source).toContain('referenceFiles')
    expect(source).toContain('onUploadReferenceFile')
    expect(source).toContain('onDeleteReferenceFile')
    expect(source).toContain('onDeleteReference')
  })

  it('App wires reference import and confirmation flow', () => {
    const source = fs.readFileSync('src/renderer/App.tsx', 'utf8')
    expect(source).toContain('referenceFiles')
    expect(source).toContain('loadReferences')
    expect(source).toContain('getReferenceData')
    expect(source).toContain('importReferenceFile')
    expect(source).toContain('saveRecognizedReferences')
    expect(source).toContain('ReferenceRecognitionModal')
    expect(source).toContain('DeepSeekKeyModal')
    expect(source).toContain('useRef')
    expect(source).toContain('currentThesisIdRef')
    expect(source).toContain('onSyncReferencesUpdated')
    expect(source).toContain('const deleted = await window.electronAPI.deleteThesis')
  })
})
