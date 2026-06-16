import { useState } from 'react'

interface ReferenceInput {
  title: string
  authors: string
  year: string
}

interface ReferenceModalProps {
  onClose: () => void
  onSubmit: (input: ReferenceInput) => void | Promise<void>
}

function ReferenceModal({ onClose, onSubmit }: ReferenceModalProps) {
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [year, setYear] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const input = {
      title: title.trim(),
      authors: authors.trim(),
      year: year.trim(),
    }

    if (!input.title || !input.authors || !input.year) {
      setError('请填写标题、作者和年份')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="w-[520px] rounded-xl bg-card shadow-lg p-6 flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-text font-bold text-lg">新增参考文献</h2>
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

        <label className="flex flex-col gap-1.5 text-xs font-bold text-text">
          标题
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-base border border-border px-3 text-sm font-normal focus:outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-text">
          作者
          <input
            value={authors}
            onChange={(event) => setAuthors(event.target.value)}
            className="h-10 rounded-base border border-border px-3 text-sm font-normal focus:outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-bold text-text">
          年份
          <input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="h-10 rounded-base border border-border px-3 text-sm font-normal focus:outline-none focus:border-primary"
          />
        </label>

        {error && <p className="text-danger text-xs">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-base border border-border text-text font-bold text-sm flex items-center justify-center hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-5 rounded-base bg-primary text-white font-bold text-sm flex items-center justify-center hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReferenceModal
