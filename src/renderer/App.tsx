import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import UploadModal from './components/UploadModal'
import VersionDetailModal from './components/VersionDetailModal'

export interface Version {
  id: string
  version: string
  date: string
  changes: string
  focus: string
  filePath: string
  fileName: string
  fileType: string
}

function App() {
  const [versions, setVersions] = useState<Version[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [dataDir, setDataDir] = useState<string>('')

  // Load versions on mount
  useEffect(() => {
    loadVersions()
    loadDataDir()
  }, [])

  const loadVersions = async () => {
    try {
      const data = await window.electronAPI.getVersions()
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

  const handleAddVersion = async (newVersion: Version) => {
    try {
      await window.electronAPI.addVersion(newVersion)
      await loadVersions()
      setShowUploadModal(false)
    } catch (error) {
      console.error('Failed to add version:', error)
    }
  }

  const handleUpdateVersion = async (id: string, updates: Partial<Version>) => {
    try {
      await window.electronAPI.updateVersion(id, updates)
      await loadVersions()
      // Update selected version if it's the same
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
      await loadVersions()
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

  return (
    <div className="flex h-screen bg-bg">
      {/* Sidebar */}
      <Sidebar
        versionCount={versions.length}
        latestVersion={versions.length > 0 ? versions[0].date : ''}
        onUploadClick={() => setShowUploadModal(true)}
        dataDir={dataDir}
      />

      {/* Main Content */}
      <Timeline
        versions={versions}
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
