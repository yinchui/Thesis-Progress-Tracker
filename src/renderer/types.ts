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

export interface ElectronAPI {
  getVersions: () => Promise<Version[]>
  addVersion: (version: Version) => Promise<boolean>
  updateVersion: (id: string, updates: Partial<Version>) => Promise<boolean>
  deleteVersion: (id: string) => Promise<boolean>
  selectFile: () => Promise<string | null>
  copyFile: (sourcePath: string, versionId: string) => Promise<string | null>
  openFile: (filePath: string) => Promise<boolean>
  getDataDir: () => Promise<string>
  selectDataDir: () => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
