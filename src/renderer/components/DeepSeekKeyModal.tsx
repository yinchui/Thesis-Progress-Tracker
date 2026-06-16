import { useState } from 'react'

interface DeepSeekKeyModalProps {
  onClose: () => void
  onSaved: () => void
}

function DeepSeekKeyModal({ onClose, onSaved }: DeepSeekKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      setError('请输入 DeepSeek API key')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      await window.electronAPI.saveDeepSeekApiKey(trimmed)
      onSaved()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[520px] max-w-[calc(100vw-32px)] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center gap-4">
          <h2 className="text-text font-bold text-lg">设置 DeepSeek API key</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-muted text-sm">DeepSeek API key 只保存在本机，不会同步到坚果云。</p>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="h-10 rounded-base border border-border px-3 text-sm focus:outline-none focus:border-primary"
          placeholder="sk-..."
        />
        {error && <p className="text-danger text-xs">{error}</p>}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-base border border-border text-sm font-bold hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="h-10 px-5 rounded-base bg-primary text-white text-sm font-bold disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeepSeekKeyModal
