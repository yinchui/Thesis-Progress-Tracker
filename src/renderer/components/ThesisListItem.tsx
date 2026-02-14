import { useState } from 'react'

export interface Thesis {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface ThesisListItemProps {
  thesis: Thesis
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  onUpdate: (updates: Partial<Thesis>) => void
}

function ThesisListItem({ thesis, isActive, onClick, onDelete, onUpdate }: ThesisListItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(thesis.title)
  const [showMenu, setShowMenu] = useState(false)

  const handleSave = () => {
    if (editTitle.trim() && editTitle !== thesis.title) {
      onUpdate({ title: editTitle.trim() })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditTitle(thesis.title)
      setIsEditing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div
      className={`group relative rounded-lg transition-colors cursor-pointer ${
        isActive
          ? 'bg-primary text-white'
          : 'hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      <div className="p-2.5">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-7 px-2 rounded border border-primary/50 bg-white text-text text-sm focus:outline-none"
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-white' : 'text-text'}`}>
              {thesis.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                isActive ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-muted hover:text-text hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        )}

        <div className={`text-xs mt-1 ${isActive ? 'text-white/70' : 'text-muted'}`}>
          更新于 {formatDate(thesis.updatedAt)}
        </div>
      </div>

      {/* Dropdown Menu */}
      {showMenu && !isEditing && (
        <div
          className="absolute right-2 top-10 z-10 bg-white rounded-lg shadow-lg border border-border py-1 min-w-24"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setIsEditing(true)
              setShowMenu(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-text hover:bg-gray-100"
          >
            重命名
          </button>
          <button
            onClick={() => {
              if (confirm('确定要删除这篇论文吗？所有版本记录将被永久删除。')) {
                onDelete()
              }
              setShowMenu(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-50"
          >
            删除
          </button>
        </div>
      )}
    </div>
  )
}

export default ThesisListItem
