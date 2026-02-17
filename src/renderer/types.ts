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
  changes: string
  focus: string
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
  copyFile: (sourcePath: string, versionId: string) => Promise<string | null>
  openFile: (filePath: string) => Promise<boolean>

  // 目录操作
  getDataDir: () => Promise<DataDirStatus>
  selectDataDir: () => Promise<DataDirStatus | null>
  resetDataDir: () => Promise<DataDirStatus>
  openDataDir: () => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
