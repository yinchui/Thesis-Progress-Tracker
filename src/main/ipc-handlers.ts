import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import log from 'electron-log';
import {
  DataDirStatus,
  resetCustomDataDir,
  resolveRuntimeDataDirStatus,
  RuntimeResolutionInput,
  setCustomDataDir,
} from './data-dir-config';
import {
  archiveSession,
  clearSession,
  createEditSession,
  getActiveSession,
  loadPersistedSession,
  startLockFileWatch,
} from './edit-session';
import { EditSessionParams } from './edit-session-types';
import './updater';
import {
  loadThesesIndex,
  saveThesesIndex,
  loadThesisVersions,
  saveThesisVersions,
  loadLocalState,
  saveLocalState,
  getThesisDir,
  resolveVersionFilePath,
  toRelativeFilePath,
  sanitizeFileName,
  mergeThesesIndex,
  Thesis,
  VersionRecord,
} from './split-data-store';
import { needsMigration, migrateToSplitFormat } from './data-migration';

// ==================== 工具函数 ====================

function getRuntimeResolutionInput(): RuntimeResolutionInput {
  const userDataPath = app.getPath('userData');
  return {
    execPath: process.execPath,
    userDataPath,
    configFilePath: path.join(userDataPath, 'data-dir-config.json'),
  };
}

function getDataDirStatus(): DataDirStatus {
  return resolveRuntimeDataDirStatus(getRuntimeResolutionInput());
}

function getDataDir(): string {
  return getDataDirStatus().effectivePath;
}

function getUserDataPath(): string {
  return app.getPath('userData');
}

function getThesisFilesDirNew(thesisTitle: string): string {
  const dir = getThesisDir(getDataDir(), thesisTitle);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 生成 UUID
function generateId(): string {
  return crypto.randomUUID();
}

// 生成不重复的文件路径
function uniqueFilePath(dir: string, fileName: string): string {
  let filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return filePath;

  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 2;
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${base}_${counter}${ext}`);
    counter++;
  }
  return filePath;
}

// ==================== Thesis IPC Handlers ====================

ipcMain.handle('get-theses', async () => {
  log.info('IPC: get-theses');
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  if (index.theses.length === 0) {
    const defaultThesis: Thesis = {
      id: generateId(),
      title: '默认论文',
      description: 'Auto-created default thesis',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    index.theses.push(defaultThesis);
    saveThesesIndex(dataDir, index);
    saveLocalState(getUserDataPath(), { currentThesisId: defaultThesis.id });
  }
  return index.theses;
});

ipcMain.handle('create-thesis', async (_event, thesisData: { title: string; description?: string }) => {
  log.info('IPC: create-thesis', thesisData);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const newThesis: Thesis = {
    id: generateId(),
    title: thesisData.title,
    description: thesisData.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  getThesisFilesDirNew(newThesis.title);
  saveThesisVersions(dataDir, newThesis.title, { versions: [] });
  index.theses.push(newThesis);
  saveThesesIndex(dataDir, index);
  saveLocalState(getUserDataPath(), { currentThesisId: newThesis.id });
  return newThesis;
});

ipcMain.handle('update-thesis', async (_event, id: string, updates: { title?: string; description?: string }) => {
  log.info('IPC: update-thesis', id, updates);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const thesisIdx = index.theses.findIndex(t => t.id === id);
  if (thesisIdx === -1) return null;
  const oldTitle = index.theses[thesisIdx].title;
  index.theses[thesisIdx] = { ...index.theses[thesisIdx], ...updates, updatedAt: new Date().toISOString() };
  if (updates.title && updates.title !== oldTitle) {
    const oldDir = getThesisDir(dataDir, oldTitle);
    const newDir = getThesisDir(dataDir, updates.title);
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      try {
        fs.renameSync(oldDir, newDir);
        log.info(`Renamed thesis dir: ${oldTitle} -> ${updates.title}`);
      } catch (e) {
        log.error('Error renaming thesis dir:', e);
      }
    }
  }
  saveThesesIndex(dataDir, index);
  return index.theses[thesisIdx];
});

ipcMain.handle('delete-thesis', async (_event, id: string) => {
  log.info('IPC: delete-thesis', id);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  if (index.theses.length <= 1) {
    log.warn('Cannot delete the last thesis');
    return false;
  }
  const thesis = index.theses.find(t => t.id === id);
  if (thesis) {
    const thesisDir = getThesisDir(dataDir, thesis.title);
    if (fs.existsSync(thesisDir)) {
      try { fs.rmSync(thesisDir, { recursive: true, force: true }); } catch (e) { log.error('Error deleting thesis directory:', e); }
    }
  }
  index.theses = index.theses.filter(t => t.id !== id);
  saveThesesIndex(dataDir, index);
  const localState = loadLocalState(getUserDataPath());
  if (localState.currentThesisId === id) {
    saveLocalState(getUserDataPath(), { currentThesisId: index.theses[0]?.id || null });
  }
  return true;
});

ipcMain.handle('set-current-thesis', async (_event, id: string) => {
  log.info('IPC: set-current-thesis', id);
  saveLocalState(getUserDataPath(), { currentThesisId: id });
  return true;
});

ipcMain.handle('get-current-thesis', async () => {
  log.info('IPC: get-current-thesis');
  return loadLocalState(getUserDataPath()).currentThesisId;
});

// ==================== Version IPC Handlers ====================

ipcMain.handle('get-versions', async (_event, thesisId?: string) => {
  log.info('IPC: get-versions', thesisId);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  if (thesisId) {
    const thesis = index.theses.find(t => t.id === thesisId);
    if (!thesis) return [];
    const data = loadThesisVersions(dataDir, thesis.title);
    return data.versions.map(v => ({
      ...v,
      filePath: v.filePath ? resolveVersionFilePath(dataDir, thesis.title, v.filePath) : undefined,
    }));
  }
  const allVersions: VersionRecord[] = [];
  for (const thesis of index.theses) {
    const data = loadThesisVersions(dataDir, thesis.title);
    allVersions.push(...data.versions.map(v => ({
      ...v,
      filePath: v.filePath ? resolveVersionFilePath(dataDir, thesis.title, v.filePath) : undefined,
    })));
  }
  return allVersions;
});

ipcMain.handle('add-version', async (_event, versionData: any, thesisId?: string) => {
  log.info('IPC: add-version', versionData, thesisId);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const localState = loadLocalState(getUserDataPath());
  const targetThesisId = thesisId || localState.currentThesisId;
  if (!targetThesisId) { log.error('No target thesis for add-version'); return false; }
  const thesis = index.theses.find(t => t.id === targetThesisId);
  if (!thesis) return false;
  const thesisDir = getThesisFilesDirNew(thesis.title);
  let relativeFilePath: string | undefined;
  if (versionData.filePath && fs.existsSync(versionData.filePath)) {
    const ext = path.extname(versionData.filePath);
    const baseName = versionData.fileName ? path.basename(versionData.fileName, ext) : generateId();
    const newFileName = `${sanitizeFileName(versionData.version)}_${sanitizeFileName(baseName)}${ext}`;
    const newFilePath = uniqueFilePath(thesisDir, newFileName);
    try {
      fs.copyFileSync(versionData.filePath, newFilePath);
      relativeFilePath = path.basename(newFilePath);
    } catch (e) { log.error('Error copying file:', e); }
  }
  const newVersion: VersionRecord = {
    id: generateId(),
    thesisId: targetThesisId,
    version: versionData.version,
    date: versionData.date,
    changes: versionData.changes,
    focus: versionData.focus,
    filePath: relativeFilePath,
    fileName: versionData.fileName,
    fileType: versionData.fileType,
  };
  const versionsData = loadThesisVersions(dataDir, thesis.title);
  versionsData.versions.unshift(newVersion);
  saveThesisVersions(dataDir, thesis.title, versionsData);
  const thesisIdx = index.theses.findIndex(t => t.id === targetThesisId);
  if (thesisIdx !== -1) {
    index.theses[thesisIdx].updatedAt = new Date().toISOString();
    saveThesesIndex(dataDir, index);
  }
  return true;
});

ipcMain.handle('update-version', async (_event, id: string, updates: any) => {
  log.info('IPC: update-version', id, updates);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  for (const thesis of index.theses) {
    const data = loadThesisVersions(dataDir, thesis.title);
    const vIdx = data.versions.findIndex(v => v.id === id);
    if (vIdx === -1) continue;
    if (updates.filePath && fs.existsSync(updates.filePath)) {
      const thesisDir = getThesisFilesDirNew(thesis.title);
      const ext = path.extname(updates.filePath);
      const ver = data.versions[vIdx].version || id;
      const baseName = data.versions[vIdx].fileName ? path.basename(data.versions[vIdx].fileName!, ext) : id;
      const newFileName = `${sanitizeFileName(ver)}_${sanitizeFileName(baseName)}${ext}`;
      const newFilePath = uniqueFilePath(thesisDir, newFileName);
      try {
        fs.copyFileSync(updates.filePath, newFilePath);
        updates.filePath = path.basename(newFilePath);
      } catch (e) { log.error('Error copying updated file:', e); }
    }
    data.versions[vIdx] = { ...data.versions[vIdx], ...updates };
    saveThesisVersions(dataDir, thesis.title, data);
    return true;
  }
  return false;
});

ipcMain.handle('delete-version', async (_event, id: string) => {
  log.info('IPC: delete-version', id);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  for (const thesis of index.theses) {
    const data = loadThesisVersions(dataDir, thesis.title);
    const version = data.versions.find(v => v.id === id);
    if (!version) continue;
    if (version.filePath) {
      const absPath = resolveVersionFilePath(dataDir, thesis.title, version.filePath);
      if (fs.existsSync(absPath)) {
        try { fs.unlinkSync(absPath); } catch (e) { log.error('Error deleting file:', e); }
      }
    }
    data.versions = data.versions.filter(v => v.id !== id);
    saveThesisVersions(dataDir, thesis.title, data);
    return true;
  }
  return false;
});

// ==================== 文件操作 IPC Handlers ====================

ipcMain.handle('select-file', async () => {
  log.info('IPC: select-file');
  const windows = BrowserWindow.getAllWindows();
  const mainWindow = windows[0];

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
    ],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('copy-file', async (_event, sourcePath: string, versionId: string, thesisId: string) => {
  log.info('IPC: copy-file', sourcePath, versionId, thesisId);
  try {
    const dataDir = getDataDir();
    const index = loadThesesIndex(dataDir);
    const thesis = index.theses.find(t => t.id === thesisId);
    const thesisTitle = thesis?.title || thesisId;
    const thesisDir = getThesisFilesDirNew(thesisTitle);
    const versionsData = loadThesisVersions(dataDir, thesisTitle);
    const version = versionsData.versions.find(v => v.id === versionId);
    const ext = path.extname(sourcePath);
    const baseName = path.basename(sourcePath, ext);
    const ver = version?.version || versionId;
    const destFileName = `${sanitizeFileName(ver)}_${sanitizeFileName(baseName)}${ext}`;
    const destPath = uniqueFilePath(thesisDir, destFileName);

    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  } catch (error) {
    log.error('Error copying file:', error);
    return null;
  }
});

ipcMain.handle('open-file', async (_event, filePath: string) => {
  log.info('IPC: open-file', filePath);
  try {
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    log.error('Error opening file:', error);
    return false;
  }
});

ipcMain.handle('get-data-dir', async () => {
  return getDataDirStatus();
});

ipcMain.handle('select-data-dir', async () => {
  log.info('IPC: select-data-dir');
  const windows = BrowserWindow.getAllWindows();
  const mainWindow = windows[0];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return setCustomDataDir(getRuntimeResolutionInput(), result.filePaths[0]);
});

ipcMain.handle('reset-data-dir', async () => {
  log.info('IPC: reset-data-dir');
  return resetCustomDataDir(getRuntimeResolutionInput());
});

ipcMain.handle('open-data-dir', async () => {
  log.info('IPC: open-data-dir');
  try {
    const status = getDataDirStatus();
    await shell.openPath(status.effectivePath);
    return true;
  } catch (error) {
    log.error('Error opening data directory:', error);
    return false;
  }
});

// ==================== Edit Session IPC Handlers ====================

ipcMain.handle('start-edit-session', async (_event, params: EditSessionParams) => {
  log.info('IPC: start-edit-session', params.baseVersionId);
  const dataDir = getDataDir();
  const index = loadThesesIndex(dataDir);
  const thesis = index.theses.find(t => t.id === params.thesisId);

  const session = createEditSession(params, dataDir, getUserDataPath(), thesis?.title);

  const openResult = await shell.openPath(session.editFilePath);
  if (openResult) {
    log.error('Failed to open file:', openResult);
    clearSession(getUserDataPath(), true);
    throw new Error(`未找到可打开此文件的程序: ${openResult}`);
  }

  if (session.autoArchive) {
    startLockFileWatch(
      session,
      () => {
        const archived = archiveSession(dataDir, getUserDataPath());
        if (archived) {
          const windows = BrowserWindow.getAllWindows();
          if (windows.length > 0) {
            windows[0].webContents.send('finish-edit-session', archived);
          }
        }
      },
      () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('edit-session-watch-error');
        }
      },
    );
  }

  return session;
});

ipcMain.handle('cancel-edit-session', async () => {
  log.info('IPC: cancel-edit-session');
  const dataDir = getDataDir();
  clearSession(dataDir, true);
  return true;
});

ipcMain.handle('finish-edit-session', async () => {
  log.info('IPC: finish-edit-session (manual)');
  const dataDir = getDataDir();
  const archived = archiveSession(dataDir, getUserDataPath());
  if (archived) {
    return true;
  }
  return false;
});

ipcMain.handle('get-pending-edit-session', async () => {
  return loadPersistedSession(getUserDataPath());
});

ipcMain.handle('resolve-pending-edit-session', async (_event, keep: boolean) => {
  const dataDir = getDataDir();
  if (keep) {
    const archived = archiveSession(dataDir, getUserDataPath());
    return archived !== null;
  }

  clearSession(getUserDataPath(), true);
  return true;
});

// ==================== 初始化 ====================

export function initializeApp(): void {
  log.info('Initializing app data...');
  const dataDir = getDataDir();
  const userDataPath = getUserDataPath();

  if (needsMigration(dataDir)) {
    log.info('Migrating data to split format...');
    migrateToSplitFormat(dataDir, userDataPath);
  }

  const index = loadThesesIndex(dataDir);
  if (index.theses.length === 0) {
    const defaultThesis: Thesis = {
      id: generateId(),
      title: '默认论文',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    index.theses.push(defaultThesis);
    saveThesesIndex(dataDir, index);
    saveLocalState(userDataPath, { currentThesisId: defaultThesis.id });
  }

  const localState = loadLocalState(userDataPath);
  if (!localState.currentThesisId || !index.theses.find(t => t.id === localState.currentThesisId)) {
    saveLocalState(userDataPath, { currentThesisId: index.theses[0]?.id || null });
  }

  const persisted = loadPersistedSession(userDataPath);
  if (persisted) {
    log.info('Found unfinished edit session:', persisted.newVersionId);
  }

  log.info('App data initialized');
}
