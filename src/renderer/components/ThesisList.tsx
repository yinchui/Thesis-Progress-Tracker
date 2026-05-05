import { useState } from 'react'
import ThesisListItem from './ThesisListItem'
import NewThesisModal from './NewThesisModal'

export interface Thesis {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface ThesisListProps {
  theses: Thesis[]
  currentThesisId: string | null
  onSelectThesis: (id: string) => void
  onCreateThesis: (title: string, description?: string) => void
  onDeleteThesis: (id: string) => void
  onUpdateThesis: (id: string, updates: Partial<Thesis>) => void
}

function ThesisList({
  theses,
  currentThesisId,
  onSelectThesis,
  onCreateThesis,
  onDeleteThesis,
  onUpdateThesis
}: ThesisListProps) {
  const [showNewModal, setShowNewModal] = useState(false)

  const handleCreate = (title: string, description?: string) => {
    onCreateThesis(title, description)
    setShowNewModal(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-text font-bold text-sm">论文列表</span>
        <button
          onClick={() => setShowNewModal(true)}
          className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          title="新建论文"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Thesis List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {theses.map((thesis) => (
          <ThesisListItem
            key={thesis.id}
            thesis={thesis}
            isActive={thesis.id === currentThesisId}
            onClick={() => onSelectThesis(thesis.id)}
            onDelete={() => onDeleteThesis(thesis.id)}
            onUpdate={(updates) => onUpdateThesis(thesis.id, updates)}
          />
        ))}
      </div>

      {/* New Thesis Modal */}
      {showNewModal && (
        <NewThesisModal
          onClose={() => setShowNewModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

export default ThesisList
