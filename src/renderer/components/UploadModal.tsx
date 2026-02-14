import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Version } from '../App'

interface UploadModalProps {
  onClose: () => void
  onSubmit: (version: Version) => void
}

function UploadModal({ onClose, onSubmit }: UploadModalProps) {
  const [version, setVersion] = useState('')
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
    if (!version || !changes || !focus || !selectedFile) {
      alert('请填写所有必填项')
      return
    }

    const id = uuidv4()
    const ext = fileName.split('.').pop() || ''
    const fileType = ext.toUpperCase()

    // Copy file to data directory
    const newFilePath = await window.electronAPI.copyFile(selectedFile, id)

    if (!newFilePath) {
      alert('文件复制失败')
      return
    }

    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const newVersion: Version = {
      id,
      version,
      date: dateStr,
      changes,
      focus,
      filePath: newFilePath,
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
              placeholder="例如：v1.0"
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Changes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text font-bold text-xs">修改内容</label>
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
            <label className="text-text font-bold text-xs">当前重点</label>
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
