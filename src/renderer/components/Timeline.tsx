import { Version } from '../App'
import VersionCard from './VersionCard'

interface TimelineProps {
  versions: Version[]
  onVersionClick: (version: Version) => void
  onOpenFile: (filePath: string) => void
}

function Timeline({ versions, onVersionClick, onOpenFile }: TimelineProps) {
  if (versions.length === 0) {
    return (
      <main className="flex-1 p-6 flex flex-col gap-4 overflow-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-text font-bold text-xl">论文进度时间线</h1>
          <p className="text-muted text-xs">按时间回看每次论文迭代，随时掌握当前写作重点</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-muted text-sm">暂无版本记录</p>
            <p className="text-muted text-xs mt-1">点击左侧"上传新版本"开始</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 p-6 flex flex-col gap-4 overflow-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-text font-bold text-xl">论文进度时间线</h1>
        <p className="text-muted text-xs">按时间回看每次论文迭代，随时掌握当前写作重点</p>
      </div>

      <div className="flex-1 flex flex-col gap-4 py-1">
        {versions.map((version, index) => (
          <div key={version.id} className="flex gap-3">
            {/* Timeline Node */}
            <div className="w-5 flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  index === 0 ? 'bg-primary' : 'bg-border'
                }`}
              />
              {index < versions.length - 1 && (
                <div className="flex-1 w-0.5 bg-border" />
              )}
            </div>

            {/* Version Card */}
            <div className="flex-1">
              <VersionCard
                version={version}
                onClick={() => onVersionClick(version)}
                onOpenFile={() => onOpenFile(version.filePath)}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

export default Timeline
