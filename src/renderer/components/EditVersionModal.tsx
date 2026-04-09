import { useState } from 'react'
import { Version } from '../App'

interface EditVersionModalProps {
  baseVersion: Version
  suggestedVersion: string
  onClose: () => void
  onSubmit: (versionInfo: {
    version: string
    changes?: string
    focus?: string
    replacementFilePath?: string
  }) => void
}

function EditVersionModal({
  baseVersion,
  suggestedVersion,
  onClose,
  onSubmit,
}: EditVersionModalProps) {
  const [version, setVersion] = useState(suggestedVersion)
  const [changes, setChanges] = useState('')
  const [focus, setFocus] = useState('')
  const [replacementFile, setReplacementFile] = useState<string | null>(null)
  const [replacementFileName, setReplacementFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setReplacementFile(files[0].path)
      setReplacementFileName(files[0].name)
    }
  }

  const handleSelectFile = async () => {
    try {
      const filePath = await window.electronAPI.selectFile()
      if (filePath) {
        setReplacementFile(filePath)
        const name = filePath.split(/[/\\]/).pop() || ''
        setReplacementFileName(name)
      }
    } catch (error) {
      console.error('Failed to select file:', error)
    }
  }

  const handleRemoveReplacement = () => {
    setReplacementFile(null)
    setReplacementFileName(null)
  }

  const handleSubmit = () => {
    if (!version) {
      alert('请填写版本号')
      return
    }

    onSubmit({
      version,
      changes: changes || undefined,
      focus: focus || undefined,
      replacementFilePath: replacementFile || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[680px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">基于 {baseVersion.version} 修改</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-base border-2 border-dashed p-4 flex flex-col items-center gap-2 transition-colors ${
            isDragging ? 'border-primary bg-accent' : 'border-border'
          }`}
        >
          {replacementFileName ? (
            <div className="text-center">
              <p className="text-text font-bold text-sm">替换文件：{replacementFileName}</p>
              <button
                onClick={handleRemoveReplacement}
                className="text-muted text-xs hover:text-danger mt-1"
              >
                恢复为原文件
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-text font-bold text-sm">
                已从 {baseVersion.version} 复制：{baseVersion.fileName}
              </p>
              <p className="text-muted text-xs mt-1">
                确认后将打开此文件进行编辑，或拖拽新文件替换
              </p>
              <button
                onClick={handleSelectFile}
                className="mt-2 px-4 h-8 rounded-base border border-border text-text font-bold text-xs hover:bg-gray-50"
              >
                替换文件
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">版本号</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="例如：v1.1"
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">修改内容（选填）</label>
            <textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="本次修改了哪些内容？"
              rows={3}
              className="rounded-base border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">当前重点（选填）</label>
            <input
              type="text"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="当前写作的重点是什么？"
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-22 h-10 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="h-10 px-5 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90"
          >
            开始编辑
          </button>
        </div>

        <p className="text-muted text-xs">文件将用系统默认程序打开，编辑完成后自动保存为新版本。</p>
      </div>
    </div>
  )
}

export default EditVersionModal
