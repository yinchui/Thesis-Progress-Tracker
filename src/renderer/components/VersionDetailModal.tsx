import { useState } from 'react'
import { Version } from '../App'

interface VersionDetailModalProps {
  version: Version
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Version>) => void
  onDelete: (id: string) => void
  onOpenFile: (filePath: string) => void
  onEditFromVersion?: (version: Version) => void
  editDisabled?: boolean
}

function VersionDetailModal({
  version,
  onClose,
  onUpdate,
  onDelete,
  onOpenFile,
  onEditFromVersion,
  editDisabled,
}: VersionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editVersion, setEditVersion] = useState(version.version)
  const [editChanges, setEditChanges] = useState(version.changes)
  const [editFocus, setEditFocus] = useState(version.focus)

  const handleSave = () => {
    onUpdate(version.id, {
      version: editVersion,
      changes: editChanges,
      focus: editFocus,
    })
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('确定要删除这个版本吗？此操作不可恢复。')) {
      onDelete(version.id)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[720px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">
            版本详情 · {version.version}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info Card */}
        <div className="rounded-base bg-accent p-3 flex flex-col gap-1.5">
          <p className="text-text font-bold text-xs">版本号：{version.version}</p>
          <p className="text-text text-xs">上传时间：{version.date}</p>
          <p className="text-text text-xs">文件类型：{version.fileType}</p>
          <p className="text-text text-xs truncate">文件路径：{version.filePath}</p>
        </div>

        {/* Changes */}
        <div className="rounded-base border border-border p-3 flex flex-col gap-1.5">
          <span className="text-text font-bold text-xs">修改内容</span>
          {isEditing ? (
            <textarea
              value={editChanges}
              onChange={(e) => setEditChanges(e.target.value)}
              rows={3}
              className="rounded-base border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          ) : (
            <p className="text-text text-sm">{version.changes}</p>
          )}
        </div>

        {/* Focus */}
        <div className="rounded-base border border-border p-3 flex flex-col gap-1.5">
          <span className="text-text font-bold text-xs">当前重点</span>
          {isEditing ? (
            <input
              type="text"
              value={editFocus}
              onChange={(e) => setEditFocus(e.target.value)}
              className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
            />
          ) : (
            <p className="text-text text-sm">{version.focus}</p>
          )}
        </div>

        {/* File */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted text-xs">论文文件：</span>
          <button
            onClick={() => onOpenFile(version.filePath)}
            className="text-primary font-bold text-xs hover:underline"
          >
            {version.fileName}
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="w-22 h-10 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="w-22 h-10 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90"
              >
                保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEditFromVersion?.(version)}
                disabled={editDisabled}
                className="h-10 px-4 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90 disabled:opacity-50"
              >
                基于此版本修改
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="w-22 h-10 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
              >
                编辑
              </button>
              <button
                onClick={handleDelete}
                className="w-22 h-10 rounded-base bg-danger text-white font-bold text-sm flex items-center justify-center hover:opacity-90"
              >
                删除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VersionDetailModal
