import { Version } from '../App'

interface VersionCardProps {
  version: Version
  onClick: () => void
  onOpenFile: () => void
}

function VersionCard({ version, onClick, onOpenFile }: VersionCardProps) {
  const handleFileClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenFile()
  }

  return (
    <div
      onClick={onClick}
      className="rounded-base bg-card shadow-card p-3.5 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-primary font-bold text-base">{version.version}</span>
        <span className="text-muted text-xs">{version.date}</span>
      </div>

      {/* Changes */}
      <p className="text-text text-sm truncate">
        修改变更：{version.changes}
      </p>

      {/* Focus */}
      <p className="text-text text-sm truncate">
        当前重点：{version.focus}
      </p>

      {/* File */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted text-xs">文件：</span>
        <button
          onClick={handleFileClick}
          className="text-primary font-bold text-xs hover:underline"
        >
          {version.fileName}
        </button>
      </div>
    </div>
  )
}

export default VersionCard
