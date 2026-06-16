import { useState } from 'react'
import { ReferenceRecord } from '../types'
import ReferenceModal from './ReferenceModal'

interface ReferenceInput {
  title: string
  authors: string
  year: string
}

interface ReferenceSectionProps {
  references: ReferenceRecord[]
  onAddReference: (input: ReferenceInput) => void | Promise<void>
  onDeleteReference: (referenceId: string) => void | Promise<void>
}

function ReferenceSection({ references, onAddReference, onDeleteReference }: ReferenceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleAddReference = async (input: ReferenceInput) => {
    await onAddReference(input)
    setShowModal(false)
    setIsExpanded(true)
  }

  const handleDeleteReference = async (referenceId: string) => {
    if (!confirm('确定要删除这条参考文献吗？')) return
    await onDeleteReference(referenceId)
  }

  return (
    <section className="rounded-base border border-border bg-card">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full h-11 px-3.5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-text font-bold text-sm">参考文献 {references.length}</span>
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
          {references.length === 0 ? (
            <div className="rounded-base bg-accent p-3 flex items-center justify-between gap-3">
              <span className="text-muted text-sm">暂无参考文献</span>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="h-8 px-3 rounded-base bg-primary text-white font-bold text-xs hover:opacity-90"
              >
                新增参考文献
              </button>
            </div>
          ) : (
            <>
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="h-8 px-3 rounded-base border border-border text-text font-bold text-xs hover:bg-gray-50"
                >
                  新增参考文献
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <ReferenceModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddReference}
        />
      )}
    </section>
  )
}

export default ReferenceSection
