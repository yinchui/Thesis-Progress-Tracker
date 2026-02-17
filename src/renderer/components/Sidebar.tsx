import ThesisList, { Thesis } from './ThesisList'

interface ThesisItem {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  theses: ThesisItem[]
  currentThesisId: string | null
  currentThesis?: ThesisItem
  onSelectThesis: (id: string) => void
  onCreateThesis: (title: string, description?: string) => void
  onDeleteThesis: (id: string) => void
  onUpdateThesis: (id: string, updates: Partial<Thesis>) => void
  versionCount: number
  latestVersion: string
  onUploadClick: () => void
  dataDir: string
  onSettingsClick: () => void
}

function Sidebar({
  theses,
  currentThesisId,
  currentThesis,
  onSelectThesis,
  onCreateThesis,
  onDeleteThesis,
  onUpdateThesis,
  versionCount,
  latestVersion,
  onUploadClick,
  dataDir,
  onSettingsClick
}: SidebarProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return dateStr.split(' ')[0]
  }

  return (
    <aside className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* Logo Section */}
      <div className="flex items-center gap-2.5 mb-4 px-3 pt-3">
        <div className="w-9 h-9 rounded-base bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-base">论</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-text font-bold text-base">论文进度管理器</span>
          <span className="text-muted text-xs">Thesis Progress Tracker</span>
        </div>
      </div>

      {/* Thesis List */}
      <div className="px-3 mb-4 flex-1 overflow-hidden">
        <ThesisList
          theses={theses}
          currentThesisId={currentThesisId}
          onSelectThesis={onSelectThesis}
          onCreateThesis={onCreateThesis}
          onDeleteThesis={onDeleteThesis}
          onUpdateThesis={onUpdateThesis}
        />
      </div>

      {/* Current Thesis Status */}
      {currentThesis && (
        <div className="mx-3 rounded-base bg-accent p-3 flex flex-col gap-2 mb-3">
          <span className="text-text font-bold text-xs">当前论文</span>
          <div className="text-text text-sm font-medium truncate" title={currentThesis.title}>
            {currentThesis.title}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted text-xs">版本数</span>
            <span className="text-text font-bold text-xs">{versionCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted text-xs">最新</span>
            <span className="text-text font-bold text-xs">{formatDate(latestVersion)}</span>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={onUploadClick}
        disabled={!currentThesisId}
        className="mx-3 mb-3 h-11 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上传新版本
      </button>

      {/* Settings */}
      <div className="px-3 pb-3">
        <button
          onClick={onSettingsClick}
          className="w-full h-10 rounded-base bg-card border border-border flex items-center gap-2 px-3 text-text text-xs hover:bg-gray-50 transition-colors"
        >
          <svg
            className="w-4 h-4 text-primary flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="truncate">{dataDir || '存储路径配置'}</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
