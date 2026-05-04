interface EditSessionBarProps {
  baseVersion: string
  newVersion: string
  autoArchive: boolean
  onCancel: () => void
  onFinish: () => void
}

function EditSessionBar({
  baseVersion,
  newVersion,
  autoArchive,
  onCancel,
  onFinish,
}: EditSessionBarProps) {
  return (
    <div className="rounded-base bg-accent border border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-base">📝</span>
        <span className="text-text text-sm font-bold">
          正在编辑 {newVersion}
        </span>
        <span className="text-muted text-xs">
          （基于 {baseVersion}）
        </span>
        {autoArchive && (
          <span className="text-muted text-xs ml-2">关闭文件后自动保存</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!autoArchive && (
          <button
            onClick={onFinish}
            className="h-8 px-3 rounded-base bg-primary text-white font-bold text-xs hover:opacity-90 transition-opacity"
          >
            完成修改
          </button>
        )}
        <button
          onClick={onCancel}
          className="h-8 px-3 rounded-base border border-border text-text font-bold text-xs hover:bg-gray-50 transition-colors"
        >
          取消编辑
        </button>
      </div>
    </div>
  )
}

export default EditSessionBar
