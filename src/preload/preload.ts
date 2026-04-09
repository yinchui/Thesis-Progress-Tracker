import { contextBridge, ipcRenderer } from 'electron';

export interface Thesis {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  thesisId: string;
  version: string;
  date: string;
  changes?: string;
  focus?: string;
  filePath: string;
  fileName: string;
  fileType: string;
}

export type DataDirSource = 'custom' | 'app' | 'fallback';

export interface DataDirStatus {
  effectivePath: string;
  source: DataDirSource;
  fallbackMessage?: string;
}

const electronAPI = {
  // Thesis management
  getTheses: (): Promise<Thesis[]> => ipcRenderer.invoke('get-theses'),
  createThesis: (title: string, description?: string): Promise<Thesis> =>
    ipcRenderer.invoke('create-thesis', { title, description }),
  updateThesis: (id: string, updates: Partial<Thesis>): Promise<boolean> =>
    ipcRenderer.invoke('update-thesis', id, updates),
  deleteThesis: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-thesis', id),
  setCurrentThesis: (id: string): Promise<boolean> => ipcRenderer.invoke('set-current-thesis', id),

  // Version management
  getVersions: (thesisId: string): Promise<Version[]> => ipcRenderer.invoke('get-versions', thesisId),
  addVersion: (version: Version, thesisId?: string): Promise<boolean> =>
    ipcRenderer.invoke('add-version', version, thesisId),
  updateVersion: (id: string, updates: Partial<Version>): Promise<boolean> =>
    ipcRenderer.invoke('update-version', id, updates),
  deleteVersion: (id: string): Promise<boolean> => ipcRenderer.invoke('delete-version', id),

  // File operations
  selectFile: (): Promise<string | null> => ipcRenderer.invoke('select-file'),
  copyFile: (sourcePath: string, versionId: string): Promise<string | null> =>
    ipcRenderer.invoke('copy-file', sourcePath, versionId),
  openFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('open-file', filePath),

  // Directory operations
  getDataDir: (): Promise<DataDirStatus> => ipcRenderer.invoke('get-data-dir'),
  selectDataDir: (): Promise<DataDirStatus | null> => ipcRenderer.invoke('select-data-dir'),
  resetDataDir: (): Promise<DataDirStatus> => ipcRenderer.invoke('reset-data-dir'),
  openDataDir: (): Promise<boolean> => ipcRenderer.invoke('open-data-dir'),

  // Edit session
  startEditSession: (params: {
    baseVersionId: string;
    thesisId: string;
    baseFilePath: string;
    baseFileName: string;
    baseFileType: string;
    versionInfo: { version: string; changes?: string; focus?: string };
    replacementFilePath?: string;
  }) => ipcRenderer.invoke('start-edit-session', params),
  cancelEditSession: (): Promise<boolean> => ipcRenderer.invoke('cancel-edit-session'),
  finishEditSession: (): Promise<boolean> => ipcRenderer.invoke('finish-edit-session'),
  onEditSessionFinished: (callback: (_event: any, session: any) => void) => {
    ipcRenderer.on('finish-edit-session', callback);
  },
  removeEditSessionListener: () => {
    ipcRenderer.removeAllListeners('finish-edit-session');
  },
  onEditSessionWatchError: (callback: () => void) => {
    ipcRenderer.on('edit-session-watch-error', (_event) => callback());
  },
  getPendingEditSession: () => ipcRenderer.invoke('get-pending-edit-session'),
  resolvePendingEditSession: (keep: boolean): Promise<boolean> =>
    ipcRenderer.invoke('resolve-pending-edit-session', keep),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
