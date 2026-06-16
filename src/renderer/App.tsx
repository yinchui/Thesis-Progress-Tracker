import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import UploadModal from './components/UploadModal'
import VersionDetailModal from './components/VersionDetailModal'
import EditVersionModal from './components/EditVersionModal'
import SettingsModal from './components/SettingsModal'
import DeepSeekKeyModal from './components/DeepSeekKeyModal'
import ReferenceRecognitionModal, {
  RecognizedReferenceDraft,
} from './components/ReferenceRecognitionModal'
import { Thesis } from './components/ThesisList'
import { DataDirStatus, EditSession, ReferenceFileRecord, ReferenceRecord } from './types'

export interface Version {
  id: string
  thesisId: string
  version: string
  date: string
  changes?: string
  focus?: string
  filePath: string
  fileName: string
  fileType: string
}

function incrementVersion(version: string): string {
  const match = version.match(/^(.*?)(\d+)(\D*)$/)
  if (!match) return version
  const [, prefix, num, suffix] = match
  return `${prefix}${parseInt(num, 10) + 1}${suffix}`
}

function App() {
  const [theses, setTheses] = useState<Thesis[]>([])
  const [currentThesisId, setCurrentThesisId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFileRecord[]>([])
  const [references, setReferences] = useState<ReferenceRecord[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showDeepSeekKeyModal, setShowDeepSeekKeyModal] = useState(false)
  const [pendingRecognition, setPendingRecognition] = useState<{
    sourceFileId: string
    fileName: string
    references: RecognizedReferenceDraft[]
  } | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [dataDirStatus, setDataDirStatus] = useState<DataDirStatus | null>(null)
  const [editSession, setEditSession] = useState<EditSession | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editBaseVersion, setEditBaseVersion] = useState<Version | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'updated' | 'conflict'>('synced')
  const [conflictFile, setConflictFile] = useState<string | null>(null)
  const currentThesisIdRef = useRef<string | null>(null)

  useEffect(() => {
    currentThesisIdRef.current = currentThesisId
  }, [currentThesisId])

  // Load theses and current thesis on mount
  useEffect(() => {
    loadTheses()
    loadDataDir()
  }, [])

  // Load thesis-specific data when current thesis changes
  useEffect(() => {
    if (currentThesisId) {
      setVersions([])
      setReferenceFiles([])
      setReferences([])
      void loadVersions(currentThesisId)
      void loadReferences(currentThesisId)
    } else {
      setVersions([])
      setReferenceFiles([])
      setReferences([])
    }
  }, [currentThesisId])

  useEffect(() => {
    const handler = (_event: any, session: EditSession) => {
      setEditSession(null)
      if (currentThesisId) {
        void loadVersions(currentThesisId)
      }
      setToast(`${session.versionInfo.version} 已自动保存`)
      setTimeout(() => setToast(null), 3000)
    }

    window.electronAPI.onEditSessionFinished(handler)

    return () => {
      window.electronAPI.removeEditSessionListener()
    }
  }, [currentThesisId])

  useEffect(() => {
    const checkPending = async () => {
      try {
        const pending = await window.electronAPI.getPendingEditSession()
        if (pending) {
          const keep = confirm(`上次编辑 ${pending.versionInfo.version} 未完成，是否保留为新版本？`)
          await window.electronAPI.resolvePendingEditSession(keep)
          if (keep && currentThesisId) {
            await loadVersions(currentThesisId)
          }
        }
      } catch (e) {
        console.error('Failed to check pending session:', e)
      }
    }

    void checkPending()
  }, [])

  useEffect(() => {
    const handleThesesUpdated = () => {
      void loadTheses()
      setSyncStatus('updated')
      setTimeout(() => setSyncStatus('synced'), 3000)
    }

    const handleVersionsUpdated = (_thesisDirName: string) => {
      if (currentThesisId) {
        void loadVersions(currentThesisId)
      }
      setSyncStatus('updated')
      setTimeout(() => setSyncStatus('synced'), 3000)
    }

    const handleReferencesUpdated = (_thesisDirName: string) => {
      if (currentThesisId) {
        void loadReferences(currentThesisId)
      }
      setSyncStatus('updated')
      setTimeout(() => setSyncStatus('synced'), 3000)
    }

    const handleConflict = (filePath: string) => {
      setSyncStatus('conflict')
      setConflictFile(filePath)
    }

    window.electronAPI.onSyncThesesUpdated(handleThesesUpdated)
    window.electronAPI.onSyncVersionsUpdated(handleVersionsUpdated)
    window.electronAPI.onSyncReferencesUpdated(handleReferencesUpdated)
    window.electronAPI.onSyncConflictDetected(handleConflict)

    return () => {
      window.electronAPI.removeSyncListeners()
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

  const loadReferences = async (thesisId: string) => {
    try {
      const data = await window.electronAPI.getReferenceData(thesisId)
      if (currentThesisIdRef.current === thesisId) {
        setReferenceFiles(data.referenceFiles)
        setReferences(data.references)
      }
    } catch (error) {
      console.error('Failed to load references:', error)
      if (currentThesisIdRef.current === thesisId) {
        setReferenceFiles([])
        setReferences([])
      }
    }
  }

  const loadDataDir = async () => {
    try {
      const status = await window.electronAPI.getDataDir()
      setDataDirStatus(status)
    } catch (error) {
      console.error('Failed to get data dir:', error)
    }
  }

  const handleSelectDataDir = async () => {
    try {
      const status = await window.electronAPI.selectDataDir()
      if (status) {
        setDataDirStatus(status)
      }
    } catch (error) {
      console.error('Failed to select data dir:', error)
      throw error
    }
  }

  const handleResetDataDir = async () => {
    try {
      const status = await window.electronAPI.resetDataDir()
      setDataDirStatus(status)
    } catch (error) {
      console.error('Failed to reset data dir:', error)
      throw error
    }
  }

  const handleOpenDataDir = async () => {
    try {
      await window.electronAPI.openDataDir()
    } catch (error) {
      console.error('Failed to open data dir:', error)
      throw error
    }
  }

  const handleSelectThesis = async (id: string) => {
    try {
      await window.electronAPI.setCurrentThesis(id)
      setCurrentThesisId(id)
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
        setReferenceFiles([])
        setReferences([])
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
      const deleted = await window.electronAPI.deleteThesis(id)
      if (!deleted) return
      await loadTheses()
      if (currentThesisId === id) {
        const remaining = theses.filter(t => t.id !== id)
        if (remaining.length > 0) {
          setCurrentThesisId(remaining[0].id)
          await loadVersions(remaining[0].id)
          await loadReferences(remaining[0].id)
        } else {
          setCurrentThesisId(null)
          setVersions([])
          setReferenceFiles([])
          setReferences([])
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

  const handleUploadReferenceFile = async () => {
    if (!currentThesisId) return
    try {
      const keyStatus = await window.electronAPI.getDeepSeekApiKeyStatus()
      if (!keyStatus.hasKey) {
        setShowDeepSeekKeyModal(true)
        return
      }

      const filePath = await window.electronAPI.selectReferenceFile()
      if (!filePath) return

      const thesisIdAtStart = currentThesisId
      setToast('正在识别参考文献')
      const result = await window.electronAPI.importReferenceFile(thesisIdAtStart, filePath)
      await loadReferences(thesisIdAtStart)

      if (currentThesisIdRef.current !== thesisIdAtStart) return

      if (result.status === 'failed') {
        alert(result.error || '识别失败')
        return
      }

      if (result.recognizedReferences?.length) {
        setPendingRecognition({
          sourceFileId: result.file.id,
          fileName: result.file.originalName,
          references: result.recognizedReferences,
        })
      } else {
        alert('未识别到参考文献')
      }
    } catch (error) {
      console.error('Failed to import reference file:', error)
      const message = error instanceof Error ? error.message : '上传识别参考文献失败'
      alert(message)
    } finally {
      setToast(null)
    }
  }

  const handleConfirmRecognizedReferences = async (drafts: RecognizedReferenceDraft[]) => {
    if (!currentThesisId || !pendingRecognition) return
    try {
      await window.electronAPI.saveRecognizedReferences(
        currentThesisId,
        pendingRecognition.sourceFileId,
        drafts
      )
      await loadReferences(currentThesisId)
      setPendingRecognition(null)
      setToast('参考文献识别结果已保存')
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to save recognized references:', error)
      alert('保存识别结果失败')
    }
  }

  const handleDeleteReferenceFile = async (fileId: string) => {
    if (!currentThesisId) return
    try {
      await window.electronAPI.deleteReferenceFile(currentThesisId, fileId, true)
      await loadReferences(currentThesisId)
      setToast('参考文献文件已删除')
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to delete reference file:', error)
      alert('删除参考文献文件失败')
    }
  }

  const handleDeleteReference = async (referenceId: string) => {
    if (!currentThesisId) return
    try {
      await window.electronAPI.deleteReference(currentThesisId, referenceId)
      await loadReferences(currentThesisId)
      setToast('参考文献已删除')
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to delete reference:', error)
      alert('删除参考文献失败')
    }
  }

  const handleOpenFile = async (filePath: string) => {
    try {
      await window.electronAPI.openFile(filePath)
    } catch (error) {
      console.error('Failed to open file:', error)
    }
  }

  const handleEditFromVersion = (version: Version) => {
    setEditBaseVersion(version)
    setSelectedVersion(null)
    setShowEditModal(true)
  }

  const handleStartEditSession = async (versionInfo: {
    version: string
    changes?: string
    focus?: string
    replacementFilePath?: string
  }) => {
    if (!editBaseVersion || !currentThesisId) return
    try {
      const session = await window.electronAPI.startEditSession({
        baseVersionId: editBaseVersion.id,
        thesisId: currentThesisId,
        baseFilePath: editBaseVersion.filePath,
        baseFileName: editBaseVersion.fileName,
        baseFileType: editBaseVersion.fileType,
        versionInfo: {
          version: versionInfo.version,
          changes: versionInfo.changes,
          focus: versionInfo.focus,
        },
        replacementFilePath: versionInfo.replacementFilePath,
      })
      setEditSession(session)
      setShowEditModal(false)
      setEditBaseVersion(null)
    } catch (error) {
      const msg = error instanceof Error ? error.message : '启动编辑失败'
      alert(msg)
    }
  }

  const handleCancelEdit = async () => {
    if (!confirm('确定要取消编辑吗？未保存的修改将丢失。')) return
    try {
      await window.electronAPI.cancelEditSession()
      setEditSession(null)
    } catch (error) {
      console.error('Failed to cancel edit:', error)
    }
  }

  const handleFinishEdit = async () => {
    try {
      const savedVersion = editSession?.versionInfo.version
      await window.electronAPI.finishEditSession()
      setEditSession(null)
      if (currentThesisId) {
        await loadVersions(currentThesisId)
      }
      setToast(`${savedVersion} 已保存`)
      setTimeout(() => setToast(null), 3000)
    } catch (error) {
      console.error('Failed to finish edit:', error)
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
        onSelectThesis={editSession ? () => {} : handleSelectThesis}
        onCreateThesis={handleCreateThesis}
        onDeleteThesis={handleDeleteThesis}
        onUpdateThesis={handleUpdateThesis}
        versionCount={versions.length}
        latestVersion={versions.length > 0 ? versions[0].date : ''}
        onUploadClick={() => setShowUploadModal(true)}
        dataDir={dataDirStatus?.effectivePath || ''}
        onSettingsClick={() => setShowSettingsModal(true)}
        uploadDisabled={!!editSession}
        syncStatus={syncStatus}
        conflictFile={conflictFile}
        onDismissConflict={() => { setSyncStatus('synced'); setConflictFile(null) }}
      />

      {/* Main Content */}
      <Timeline
        versions={versions}
        thesisTitle={currentThesis?.title || ''}
        referenceFiles={referenceFiles}
        references={references}
        onUploadReferenceFile={handleUploadReferenceFile}
        onDeleteReferenceFile={handleDeleteReferenceFile}
        onDeleteReference={handleDeleteReference}
        onVersionClick={setSelectedVersion}
        onOpenFile={handleOpenFile}
        editSession={editSession ? {
          baseVersion: versions.find(v => v.id === editSession.baseVersionId)?.version || '?',
          newVersion: editSession.versionInfo.version,
          autoArchive: editSession.autoArchive,
        } : null}
        onCancelEdit={handleCancelEdit}
        onFinishEdit={handleFinishEdit}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          versions={versions}
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
          onEditFromVersion={handleEditFromVersion}
          editDisabled={!!editSession}
        />
      )}

      {showEditModal && editBaseVersion && (
        <EditVersionModal
          baseVersion={editBaseVersion}
          suggestedVersion={incrementVersion(editBaseVersion.version)}
          onClose={() => {
            setShowEditModal(false)
            setEditBaseVersion(null)
          }}
          onSubmit={handleStartEditSession}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          status={dataDirStatus}
          onClose={() => setShowSettingsModal(false)}
          onSelectDir={handleSelectDataDir}
          onResetDir={handleResetDataDir}
          onOpenDir={handleOpenDataDir}
        />
      )}

      {showDeepSeekKeyModal && (
        <DeepSeekKeyModal
          onClose={() => setShowDeepSeekKeyModal(false)}
          onSaved={() => {
            setShowDeepSeekKeyModal(false)
            void handleUploadReferenceFile()
          }}
        />
      )}

      {pendingRecognition && (
        <ReferenceRecognitionModal
          fileName={pendingRecognition.fileName}
          references={pendingRecognition.references}
          onCancel={() => setPendingRecognition(null)}
          onConfirm={handleConfirmRecognizedReferences}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-primary text-white px-4 py-2 rounded-base shadow-card text-sm font-bold z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

export default App
