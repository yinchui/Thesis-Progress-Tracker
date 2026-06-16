import { useMemo, useState } from 'react'
import { ReferenceFileRecord, ReferenceRecord } from '../types'

interface ReferenceSectionProps {
  referenceFiles: ReferenceFileRecord[]
  references: ReferenceRecord[]
  onUploadReferenceFile: () => void | Promise<void>
  onDeleteReferenceFile: (fileId: string) => void | Promise<void>
  onDeleteReference: (referenceId: string) => void | Promise<void>
}

function statusLabel(status: ReferenceFileRecord['status']): string {
  if (status === 'recognizing') return '识别中'
  if (status === 'ready') return '已识别'
  if (status === 'failed') return '识别失败'
  return '待确认'
}

function statusClass(status: ReferenceFileRecord['status']): string {
  if (status === 'ready') return 'bg-green-50 text-green-700 border-green-200'
  if (status === 'failed') return 'bg-red-50 text-danger border-red-200'
  if (status === 'recognizing') return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-accent text-muted border-border'
}

function ReferenceSection({
  referenceFiles,
  references,
  onUploadReferenceFile,
  onDeleteReferenceFile,
  onDeleteReference,
}: ReferenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const fileNameById = useMemo(
    () => new Map(referenceFiles.map(file => [file.id, file.originalName])),
    [referenceFiles]
  )

  const handleDeleteReference = async (referenceId: string) => {
    if (!confirm('确定要删除这条参考文献吗？')) return
    await onDeleteReference(referenceId)
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('确定删除这个参考文献文件吗？由它识别出的条目也会一起删除。')) return
    await onDeleteReferenceFile(fileId)
  }

  return (
    <section className="rounded-base border border-border bg-card">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full h-11 px-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-text font-bold text-sm">
          参考文献 {references.length}
          {referenceFiles.length > 0 && (
            <span className="ml-2 text-muted font-normal text-xs">{referenceFiles.length} 个文件</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-border p-3 flex flex-col gap-3">
          <div className="rounded-base bg-accent p-3 flex items-center justify-between gap-3">
            <span className="text-muted text-sm">
              {referenceFiles.length === 0 ? '暂无参考文献文件' : '管理已上传的参考文献文件'}
            </span>
            <button
              type="button"
              onClick={onUploadReferenceFile}
              className="h-8 px-3 rounded-base bg-primary text-white font-bold text-xs hover:opacity-90"
            >
              上传参考文献文件
            </button>
          </div>

          {referenceFiles.length > 0 && (
            <div className="flex flex-col gap-2">
              {referenceFiles.map(file => (
                <div
                  key={file.id}
                  className="rounded-base border border-border px-3 py-2 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex flex-col gap-1">
                    <span className="text-text text-sm font-bold truncate">{file.originalName}</span>
                    <span className="text-muted text-xs truncate">{file.filePath}</span>
                    {file.error && <span className="text-danger text-xs">{file.error}</span>}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusClass(file.status)}`}>
                      {statusLabel(file.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-danger text-xs font-bold hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {references.length === 0 ? (
            <div className="rounded-base border border-dashed border-border p-3 text-muted text-sm">
              暂无参考文献
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {references.map(reference => (
                <div
                  key={reference.id}
                  className="rounded-base border border-border px-3 py-2 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex flex-col gap-1">
                    <span className="text-text text-sm font-bold truncate">{reference.title}</span>
                    <span className="text-muted text-xs truncate">
                      {reference.authors} · {reference.year}
                    </span>
                    {reference.sourceFileId && (
                      <span className="text-muted text-[11px] truncate">
                        来源：{fileNameById.get(reference.sourceFileId) || '已删除文件'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteReference(reference.id)}
                    className="shrink-0 text-danger text-xs font-bold hover:underline"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ReferenceSection
