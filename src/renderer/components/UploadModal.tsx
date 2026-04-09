import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Version } from '../App'

function generateNextVersion(existingVersions: Version[]): string {
  const today = new Date()
  const datePrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  let maxSuffix = 0
  for (const existingVersion of existingVersions) {
    if (!existingVersion.version.startsWith(datePrefix)) {
      continue
    }

    const match = existingVersion.version.match(/-(\d+)$/)
    if (!match) {
      continue
    }

    const suffix = Number.parseInt(match[1], 10)
    if (suffix > maxSuffix) {
      maxSuffix = suffix
    }
  }

  return `${datePrefix}-${maxSuffix + 1}`
}

interface UploadModalProps {
  versions: Version[]
  onClose: () => void
  onSubmit: (version: Omit<Version, 'thesisId'>) => void
}

function UploadModal({ versions, onClose, onSubmit }: UploadModalProps) {
  const [version, setVersion] = useState(() => generateNextVersion(versions))
  const [changes, setChanges] = useState('')
  const [focus, setFocus] = useState('')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const file = files[0]
      setSelectedFile(file.path)
      setFileName(file.name)
    }
  }

  const handleSelectFile = async () => {
    try {
      const filePath = await window.electronAPI.selectFile()
      if (filePath) {
        setSelectedFile(filePath)
        const name = filePath.split(/[/\\]/).pop() || ''
        setFileName(name)
      }
    } catch (error) {
      console.error('Failed to select file:', error)
    }
  }

  const handleSubmit = async () => {
    if (!version || !selectedFile) {
      alert('请填写版本号并选择文件')
      return
    }

    const id = uuidv4()
    const ext = fileName.split('.').pop() || ''
    const fileType = ext.toUpperCase()

    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Note: file will be copied by the backend, so we pass the original path
    const newVersion = {
      id,
      version,
      date: dateStr,
      changes: changes || undefined,
      focus: focus || undefined,
      filePath: selectedFile, // Backend will copy this
      fileName,
      fileType,
    }

    onSubmit(newVersion)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[680px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">上传新版本</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`h-40 rounded-base border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
            isDragging ? 'border-primary bg-accent' : 'border-border'
          }`}
        >
          {fileName ? (
            <div className="text-center">
              <p className="text-text font-bold text-sm">{fileName}</p>
              <button
                onClick={() => {
                  setSelectedFile(null)
                  setFileName('')
                }}
                className="text-muted text-xs hover:text-danger mt-1"
              >
                移除
              </button>
            </div>
          ) : (
            <>
              <p className="text-text font-bold text-sm">拖拽论文文件到这里</p>
              <p className="text-muted text-xs">支持 PDF / DOC / DOCX / TXT</p>
              <button
                onClick={handleSelectFile}
                className="mt-2 px-4 h-9 rounded-base bg-primary text-white font-bold text-sm"
              >
                选择文件
              </button>
            </>
          )}
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          {/* Version */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">版本号</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="例如：2026-04-09-1"
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Changes */}
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

          {/* Focus */}
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

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="w-22 h-10 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="w-30 h-10 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90"
          >
            提交并刷新
          </button>
        </div>

        {/* Hint */}
        <p className="text-muted text-xs">上传成功后将自动更新时间线并定位到最新版本。</p>
      </div>
    </div>
  )
}

export default UploadModal
