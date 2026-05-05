import { useState, useEffect } from 'react'
import { DataDirStatus, UpdateInfo } from '../types'

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

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'done' | 'error'

function SettingsModal({ status, onClose, onSelectDir, onResetDir, onOpenDir }: SettingsModalProps) {
  const [appVersion, setAppVersion] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setAppVersion)
    return () => {
      window.electronAPI.removeUpdateProgressListener()
    }
  }, [])

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      alert(message)
    }
  }

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    setErrorMsg('')
    try {
      const info = await window.electronAPI.checkForUpdate()
      setUpdateInfo(info)
      setUpdateStatus(info.hasUpdate ? 'available' : 'up-to-date')
    } catch {
      setUpdateStatus('error')
      setErrorMsg('检查更新失败，请检查网络连接')
    }
  }

  const handleDownload = async () => {
    if (!updateInfo?.downloadUrl) return
    setUpdateStatus('downloading')
    setDownloadPercent(0)

    window.electronAPI.onUpdateProgress((percent) => {
      setDownloadPercent(percent)
    })

    try {
      const result = await window.electronAPI.downloadUpdate(updateInfo.downloadUrl)
      window.electronAPI.removeUpdateProgressListener()
      if (result.success) {
        setUpdateStatus('done')
      } else {
        setUpdateStatus('error')
        setErrorMsg(result.error || '下载失败')
      }
    } catch {
      window.electronAPI.removeUpdateProgressListener()
      setUpdateStatus('error')
      setErrorMsg('下载失败，请检查网络连接')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[680px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-text font-bold text-lg">设置</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 存储路径设置 */}
        <div className="text-text font-bold text-sm">存储路径</div>

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
            onClick={() => { void handleAction(onSelectDir) }}
            className="h-10 px-4 rounded-base bg-primary text-white font-bold text-sm hover:opacity-90"
          >
            选择目录
          </button>
          <button
            onClick={() => { void handleAction(onResetDir) }}
            className="h-10 px-4 rounded-base border border-border text-text font-bold text-sm hover:bg-gray-50"
          >
            恢复默认
          </button>
          <button
            onClick={() => { void handleAction(onOpenDir) }}
            className="h-10 px-4 rounded-base border border-border text-text font-bold text-sm hover:bg-gray-50"
          >
            打开当前目录
          </button>
        </div>

        <div className="text-xs text-muted">
          将数据目录设置为坚果云同步文件夹即可实现多设备同步
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border" />

        {/* 应用更新 */}
        <div className="text-text font-bold text-sm">应用更新</div>

        <div className="rounded-base border border-border p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text">当前版本：v{appVersion}</div>
            {updateStatus === 'available' && updateInfo && (
              <div className="text-sm text-primary font-bold">新版本：v{updateInfo.latestVersion}</div>
            )}
          </div>

          {updateStatus === 'checking' && (
            <div className="text-xs text-muted">正在检查更新...</div>
          )}
          {updateStatus === 'up-to-date' && (
            <div className="text-xs text-green-600">已是最新版本</div>
          )}
          {updateStatus === 'downloading' && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs text-muted">正在下载更新... {downloadPercent}%</div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${downloadPercent}%` }}
                />
              </div>
            </div>
          )}
          {updateStatus === 'done' && (
            <div className="text-xs text-green-600">安装包已下载并打开，请拖拽安装后重启应用</div>
          )}
          {updateStatus === 'error' && (
            <div className="text-xs text-red-500">{errorMsg}</div>
          )}
          {updateStatus === 'available' && updateInfo?.releaseNotes && (
            <div className="text-xs text-muted mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap">
              {updateInfo.releaseNotes}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {(updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'error') && (
            <button
              onClick={handleCheckUpdate}
              className="h-10 px-4 rounded-base bg-primary text-white font-bold text-sm hover:opacity-90"
            >
              检查更新
            </button>
          )}
          {updateStatus === 'available' && updateInfo?.downloadUrl && (
            <button
              onClick={handleDownload}
              className="h-10 px-4 rounded-base bg-primary text-white font-bold text-sm hover:opacity-90"
            >
              下载更新
            </button>
          )}
          {updateStatus === 'available' && !updateInfo?.downloadUrl && (
            <div className="text-xs text-muted self-center">未找到当前平台的安装包</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
