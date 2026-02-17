import { DataDirStatus } from '../types'

interface SettingsModalProps {
  status: DataDirStatus | null
  onClose: () => void
  onSelectDir: () => Promise<void>
  onResetDir: () => Promise<void>
  onOpenDir: () => Promise<void>
}

function formatSource(source: DataDirStatus['source'] | undefined): string {
  if (source === 'custom') return '用户自定义'
  if (source === 'app') return '程序目录默认'
  if (source === 'fallback') return '用户目录回退'
  return '-'
}

function SettingsModal({ status, onClose, onSelectDir, onResetDir, onOpenDir }: SettingsModalProps) {
  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      alert(message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[680px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-text font-bold text-lg">存储路径设置</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status?.fallbackMessage && (
          <div className="rounded-base border border-yellow-300 bg-yellow-50 text-yellow-800 text-xs px-3 py-2">
            {status.fallbackMessage}
          </div>
        )}

        <div className="rounded-base border border-border p-3 flex flex-col gap-2">
          <div className="text-xs text-muted">当前生效路径</div>
          <div className="text-sm text-text break-all">{status?.effectivePath || '-'}</div>
          <div className="text-xs text-muted">路径来源：{formatSource(status?.source)}</div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              void handleAction(onSelectDir)
            }}
            className="h-10 px-4 rounded-base bg-primary text-white font-bold text-sm hover:opacity-90"
          >
            选择目录
          </button>
          <button
            onClick={() => {
              void handleAction(onResetDir)
            }}
            className="h-10 px-4 rounded-base border border-border text-text font-bold text-sm hover:bg-gray-50"
          >
            恢复默认
          </button>
          <button
            onClick={() => {
              void handleAction(onOpenDir)
            }}
            className="h-10 px-4 rounded-base border border-border text-text font-bold text-sm hover:bg-gray-50"
          >
            打开当前目录
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
