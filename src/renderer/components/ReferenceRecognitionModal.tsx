import { useState } from 'react'

export interface RecognizedReferenceDraft {
  title: string
  authors: string
  year: string
}

interface ReferenceRecognitionModalProps {
  fileName: string
  references: RecognizedReferenceDraft[]
  onCancel: () => void
  onConfirm: (references: RecognizedReferenceDraft[]) => void | Promise<void>
}

function ReferenceRecognitionModal({
  fileName,
  references,
  onCancel,
  onConfirm,
}: ReferenceRecognitionModalProps) {
  const [drafts, setDrafts] = useState(references)
  const [isSaving, setIsSaving] = useState(false)

  const updateDraft = (
    index: number,
    field: keyof RecognizedReferenceDraft,
    value: string
  ) => {
    setDrafts(prev => prev.map((draft, i) => (
      i === index ? { ...draft, [field]: value } : draft
    )))
  }

  const removeDraft = (index: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = async () => {
    const valid = drafts.filter(item => (
      item.title.trim() && item.authors.trim() && item.year.trim()
    ))
    if (valid.length === 0) {
      alert('没有可保存的参考文献')
      return
    }

    setIsSaving(true)
    try {
      await onConfirm(valid)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-[760px] max-w-[calc(100vw-32px)] max-h-[82vh] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-text font-bold text-lg">确认识别结果</h2>
          <p className="text-muted text-xs mt-1 truncate">{fileName}</p>
        </div>

        <div className="overflow-auto flex flex-col gap-3 pr-1">
          {drafts.map((draft, index) => (
            <div
              key={index}
              className="rounded-base border border-border p-3 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_96px_auto] gap-2 items-end"
            >
              <label className="text-xs font-bold text-text flex flex-col gap-1">
                标题
                <input
                  value={draft.title}
                  onChange={event => updateDraft(index, 'title', event.target.value)}
                  className="h-9 min-w-0 rounded-base border border-border px-2 text-sm font-normal focus:outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs font-bold text-text flex flex-col gap-1">
                作者
                <input
                  value={draft.authors}
                  onChange={event => updateDraft(index, 'authors', event.target.value)}
                  className="h-9 min-w-0 rounded-base border border-border px-2 text-sm font-normal focus:outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs font-bold text-text flex flex-col gap-1">
                年份
                <input
                  value={draft.year}
                  onChange={event => updateDraft(index, 'year', event.target.value)}
                  className="h-9 min-w-0 rounded-base border border-border px-2 text-sm font-normal focus:outline-none focus:border-primary"
                />
              </label>
              <button
                type="button"
                onClick={() => removeDraft(index)}
                className="h-9 px-3 text-danger text-xs font-bold hover:underline"
              >
                删除
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-5 rounded-base border border-border text-sm font-bold hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirm}
            className="h-10 px-5 rounded-base bg-primary text-white text-sm font-bold disabled:opacity-50"
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReferenceRecognitionModal
