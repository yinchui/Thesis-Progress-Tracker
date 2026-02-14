import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import UploadModal from './components/UploadModal'
import VersionDetailModal from './components/VersionDetailModal'
import ThesisList, { Thesis } from './components/ThesisList'

export interface Version {
  id: string
  thesisId: string
  version: string
  date: string
  changes: string
  focus: string
  filePath: string
  fileName: string
  fileType: string
}

function App() {
  const [theses, setTheses] = useState<Thesis[]>([])
  const [currentThesisId, setCurrentThesisId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [dataDir, setDataDir] = useState<string>('')

  // Load theses and current thesis on mount
  useEffect(() => {
    loadTheses()
    loadDataDir()
  }, [])

  // Load versions when current thesis changes
  useEffect(() => {
    if (currentThesisId) {
      loadVersions(currentThesisId)
    }
  }, [currentThesisId])

  const loadTheses = async () => {
    try {
      const data = await window.electronAPI.getTheses()
      setTheses(data)
      if (data.length > 0 && !currentThesisId) {
        setCurrentThesisId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load theses:', error)
    }
  }

  const loadVersions = async (thesisId: string) => {
    try {
      const data = await window.electronAPI.getVersions(thesisId)
      setVersions(data)
    } catch (error) {
      console.error('Failed to load versions:', error)
    }
  }

  const loadDataDir = async () => {
    try {
      const dir = await window.electronAPI.getDataDir()
      setDataDir(dir)
    } catch (error) {
      console.error('Failed to get data dir:', error)
    }
  }

  const handleSelectThesis = async (id: string) => {
    try {
      await window.electronAPI.setCurrentThesis(id)
      setCurrentThesisId(id)
      await loadVersions(id)
    } catch (error) {
      console.error('Failed to select thesis:', error)
    }
  }

  const handleCreateThesis = async (title: string, description?: string) => {
    try {
      const newThesis = await window.electronAPI.createThesis(title, description)
      if (newThesis) {
        await loadTheses()
        setCurrentThesisId(newThesis.id)
        setVersions([])
      }
    } catch (error) {
      console.error('Failed to create thesis:', error)
    }
  }

  const handleUpdateThesis = async (id: string, updates: Partial<Thesis>) => {
    try {
      await window.electronAPI.updateThesis(id, updates)
      await loadTheses()
    } catch (error) {
      console.error('Failed to update thesis:', error)
    }
  }

  const handleDeleteThesis = async (id: string) => {
    try {
      await window.electronAPI.deleteThesis(id)
      await loadTheses()
      if (currentThesisId === id) {
        const remaining = theses.filter(t => t.id !== id)
        if (remaining.length > 0) {
          setCurrentThesisId(remaining[0].id)
          await loadVersions(remaining[0].id)
        } else {
          setCurrentThesisId(null)
          setVersions([])
        }
      }
    } catch (error) {
      console.error('Failed to delete thesis:', error)
    }
  }

  const handleAddVersion = async (newVersion: Omit<Version, 'thesisId'>) => {
    if (!currentThesisId) return
    try {
      await window.electronAPI.addVersion({
        ...newVersion,
        thesisId: currentThesisId
      } as Version, currentThesisId)
      await loadVersions(currentThesisId)
      setShowUploadModal(false)
    } catch (error) {
      console.error('Failed to add version:', error)
    }
  }

  const handleUpdateVersion = async (id: string, updates: Partial<Version>) => {
    try {
      await window.electronAPI.updateVersion(id, updates)
      if (currentThesisId) {
        await loadVersions(currentThesisId)
      }
      if (selectedVersion?.id === id) {
        setSelectedVersion({ ...selectedVersion, ...updates })
      }
    } catch (error) {
      console.error('Failed to update version:', error)
    }
  }

  const handleDeleteVersion = async (id: string) => {
    try {
      await window.electronAPI.deleteVersion(id)
      if (currentThesisId) {
        await loadVersions(currentThesisId)
      }
      if (selectedVersion?.id === id) {
        setSelectedVersion(null)
      }
    } catch (error) {
      console.error('Failed to delete version:', error)
    }
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      await window.electronAPI.openFile(filePath)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const currentThesis = theses.find(t => t.id === currentThesisId)

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar with Thesis List */}
      <Sidebar
        theses={theses}
        currentThesisId={currentThesisId}
        currentThesis={currentThesis}
        onSelectThesis={handleSelectThesis}
        onCreateThesis={handleCreateThesis}
        onDeleteThesis={handleDeleteThesis}
        onUpdateThesis={handleUpdateThesis}
        versionCount={versions.length}
        latestVersion={versions.length > 0 ? versions[0].date : ''}
        onUploadClick={() => setShowUploadModal(true)}
        dataDir={dataDir}
      />

      {/* Main Content */}
      <Timeline
        versions={versions}
        thesisTitle={currentThesis?.title || ''}
        onVersionClick={setSelectedVersion}
        onOpenFile={handleOpenFile}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleAddVersion}
        />
      )}

      {/* Version Detail Modal */}
      {selectedVersion && (
        <VersionDetailModal
          version={selectedVersion}
          onClose={() => setSelectedVersion(null)}
          onUpdate={handleUpdateVersion}
          onDelete={handleDeleteVersion}
          onOpenFile={handleOpenFile}
        />
      )}
    </div>
  )
}

export default App
