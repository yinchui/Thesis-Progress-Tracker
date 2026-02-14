import { contextBridge, ipcRenderer } from 'electron';

export interface Version {
  id: string;
  version: string;
  date: string;
  changes: string;
  focus: string;
  filePath: string;
  fileName: string;
  fileType: string;
}

const electronAPI = {
  // Version management
  getVersions: (): Promise<Version[]> => ipcRenderer.invoke('get-versions'),
  addVersion: (version: Version): Promise<boolean> => ipcRenderer.invoke('add-version', version),
  updateVersion: (id: string, updates: Partial<Version>): Promise<boolean> =>
    ipcRenderer.invoke('update-version', id, updates),
  deleteVersion: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-version', id),

  // File operations
  selectFile: (): Promise<string | null> => ipcRenderer.invoke('select-file'),
  copyFile: (sourcePath: string, versionId: string): Promise<string | null> =>
    ipcRenderer.invoke('copy-file', sourcePath, versionId),
  openFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('open-file', filePath),

  // Directory operations
  getDataDir: (): Promise<string> => ipcRenderer.invoke('get-data-dir'),
  selectDataDir: (): Promise<string | null> => ipcRenderer.invoke('select-data-dir'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
