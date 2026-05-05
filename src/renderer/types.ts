export interface Thesis {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

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

export type DataDirSource = 'custom' | 'app' | 'fallback'

export interface DataDirStatus {
  effectivePath: string
  source: DataDirSource
  fallbackMessage?: string
}

export interface EditSession {
  newVersionId: string
  baseVersionId: string
  thesisId: string
  versionInfo: {
    version: string
    changes?: string
    focus?: string
  }
  editFilePath: string
  fileName: string
  fileType: string
  autoArchive: boolean
  date: string
}

export interface ElectronAPI {
  // 论文相关
  getTheses: () => Promise<Thesis[]>
  createThesis: (title: string, description?: string) => Promise<Thesis>
  updateThesis: (id: string, updates: Partial<Thesis>) => Promise<boolean>
  deleteThesis: (id: string) => Promise<boolean>
  setCurrentThesis: (id: string) => Promise<boolean>

  // 版本相关
  getVersions: (thesisId: string) => Promise<Version[]>
  addVersion: (thesisId: string, version: Version) => Promise<boolean>
  updateVersion: (id: string, updates: Partial<Version>) => Promise<boolean>
  deleteVersion: (id: string) => Promise<boolean>

  // 文件操作
  selectFile: () => Promise<string | null>
  copyFile: (sourcePath: string, versionId: string, thesisId: string) => Promise<string | null>
  openFile: (filePath: string) => Promise<boolean>

  // 目录操作
  getDataDir: () => Promise<DataDirStatus>
  selectDataDir: () => Promise<DataDirStatus | null>
  resetDataDir: () => Promise<DataDirStatus>
  openDataDir: () => Promise<boolean>

  // 编辑会话
  startEditSession: (params: {
    baseVersionId: string
    thesisId: string
    baseFilePath: string
    baseFileName: string
    baseFileType: string
    versionInfo: { version: string; changes?: string; focus?: string }
    replacementFilePath?: string
  }) => Promise<EditSession>
  cancelEditSession: () => Promise<boolean>
  finishEditSession: () => Promise<boolean>
  onEditSessionFinished: (callback: (event: any, session: EditSession) => void) => void
  removeEditSessionListener: () => void
  onEditSessionWatchError: (callback: () => void) => void
  removeEditSessionWatchErrorListener: () => void
  getPendingEditSession: () => Promise<EditSession | null>
  resolvePendingEditSession: (keep: boolean) => Promise<boolean>

  // 更新
  getAppVersion: () => Promise<string>
  checkForUpdate: () => Promise<UpdateInfo>
  downloadUpdate: (url: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  onUpdateProgress: (callback: (percent: number) => void) => void
  removeUpdateProgressListener: () => void

  // Sync events
  onSyncThesesUpdated: (callback: () => void) => void
  onSyncVersionsUpdated: (callback: (thesisDirName: string) => void) => void
  onSyncConflictDetected: (callback: (filePath: string) => void) => void
  removeSyncListeners: () => void
}

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl?: string
  releaseNotes?: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
