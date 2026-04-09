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

// ==================== 绫诲瀷瀹氫箟 ====================

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
  filePath?: string;
  fileName?: string;
  fileType?: string;
}

export interface AppData {
  theses: Thesis[];
  currentThesisId: string | null;
  versions: Version[];
}

// ==================== 宸ュ叿鍑芥暟 ====================

// 鑾峰彇鏁版嵁鐩綍
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

// 鑾峰彇鏁版嵁鏂囦欢璺緞
function getDataFilePath(): string {
  return path.join(getDataDir(), 'data.json');
}

// 鑾峰彇璁烘枃鏂囦欢瀛樺偍鐩綍
function getThesisFilesDir(thesisId: string): string {
  const dir = path.join(getDataDir(), 'files', `thesis_${thesisId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 鐢熸垚 UUID
function generateId(): string {
  return crypto.randomUUID();
}

// 鍔犺浇鏁版嵁
function loadData(): AppData {
  const filePath = getDataFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    log.error('Error loading data:', error);
  }
  return {
    theses: [],
    currentThesisId: null,
    versions: []
  };
}

// 淇濆瓨鏁版嵁
function saveData(data: AppData): boolean {
  const filePath = getDataFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    log.error('Error saving data:', error);
    return false;
  }
}

// 鍒涘缓榛樿璁烘枃锛堝悜鍚庡吋瀹癸級
function ensureDefaultThesis(): AppData {
  let data = loadData();

  // 濡傛灉娌℃湁璁烘枃锛屽垱寤轰竴涓粯璁よ鏂?
  if (data.theses.length === 0) {
    const defaultThesis: Thesis = {
      id: generateId(),
      title: '榛樿璁烘枃',
      description: 'Auto-created default thesis',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 灏濊瘯杩佺Щ鏃х増鏈暟鎹?
    const oldVersionsFile = path.join(getDataDir(), 'versions.json');
    if (fs.existsSync(oldVersionsFile)) {
      try {
        const oldVersions = JSON.parse(fs.readFileSync(oldVersionsFile, 'utf-8'));
        if (Array.isArray(oldVersions) && oldVersions.length > 0) {
          // 涓烘棫鐗堟湰娣诲姞 thesisId
          data.versions = oldVersions.map((v: any) => ({
            ...v,
            thesisId: defaultThesis.id
          }));
          log.info(`Migrated ${oldVersions.length} old versions to default thesis`);

          // 绉诲姩鏃ф枃浠跺埌鏂扮洰褰?
          const thesisFilesDir = getThesisFilesDir(defaultThesis.id);
          for (const v of data.versions) {
            if (v.filePath && fs.existsSync(v.filePath)) {
              const ext = path.extname(v.filePath);
              const newFileName = `version_${v.id}${ext}`;
              const newFilePath = path.join(thesisFilesDir, newFileName);
              try {
                fs.copyFileSync(v.filePath, newFilePath);
                v.filePath = newFilePath;
              } catch (e) {
                log.error('Error migrating file:', e);
              }
            }
          }
        }
        // 鍒犻櫎鏃х増鏈枃浠?
        fs.unlinkSync(oldVersionsFile);
      } catch (e) {
        log.error('Error migrating old versions:', e);
      }
    }

    data.theses.push(defaultThesis);
    data.currentThesisId = defaultThesis.id;
    saveData(data);
    log.info('Created default thesis for backward compatibility');
  }

  // 纭繚褰撳墠璁烘枃鏈夋晥
  if (!data.currentThesisId || !data.theses.find(t => t.id === data.currentThesisId)) {
    data.currentThesisId = data.theses[0]?.id || null;
    saveData(data);
  }

  return data;
}

// ==================== Thesis IPC Handlers ====================

// 鑾峰彇鎵€鏈夎鏂囧垪琛?
ipcMain.handle('get-theses', async () => {
  log.info('IPC: get-theses');
  const data = ensureDefaultThesis();
  return data.theses;
});

// 鍒涘缓鏂拌鏂?
ipcMain.handle('create-thesis', async (_event, thesisData: { title: string; description?: string }) => {
  log.info('IPC: create-thesis', thesisData);
  const data = loadData();

  const newThesis: Thesis = {
    id: generateId(),
    title: thesisData.title,
    description: thesisData.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 鍒涘缓璁烘枃鏂囦欢鐩綍
  getThesisFilesDir(newThesis.id);

  data.theses.push(newThesis);
  data.currentThesisId = newThesis.id;

  if (saveData(data)) {
    return newThesis;
  }
  return null;
});

// 鏇存柊璁烘枃淇℃伅
ipcMain.handle('update-thesis', async (_event, id: string, updates: { title?: string; description?: string }) => {
  log.info('IPC: update-thesis', id, updates);
  const data = loadData();
  const index = data.theses.findIndex(t => t.id === id);

  if (index !== -1) {
    data.theses[index] = {
      ...data.theses[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (saveData(data)) {
      return data.theses[index];
    }
  }
  return null;
});

// 鍒犻櫎璁烘枃锛堝悓鏃跺垹闄ゆ墍鏈夌増鏈拰鏂囦欢锛?
ipcMain.handle('delete-thesis', async (_event, id: string) => {
  log.info('IPC: delete-thesis', id);
  const data = loadData();

  // 妫€鏌ユ槸鍚︽槸鏈€鍚庝竴涓鏂?
  if (data.theses.length <= 1) {
    log.warn('Cannot delete the last thesis');
    return false;
  }

  // 鍒犻櫎璁烘枃鐨勬墍鏈夌増鏈枃浠?
  const thesisVersions = data.versions.filter(v => v.thesisId === id);
  for (const v of thesisVersions) {
    if (v.filePath && fs.existsSync(v.filePath)) {
      try {
        fs.unlinkSync(v.filePath);
      } catch (e) {
        log.error('Error deleting version file:', e);
      }
    }
  }

  // 鍒犻櫎璁烘枃鏂囦欢鐩綍
  const thesisFilesDir = path.join(getDataDir(), 'files', `thesis_${id}`);
  if (fs.existsSync(thesisFilesDir)) {
    try {
      fs.rmSync(thesisFilesDir, { recursive: true, force: true });
    } catch (e) {
      log.error('Error deleting thesis files directory:', e);
    }
  }

  // 鍒犻櫎璁烘枃鍙婂叾鐗堟湰
  data.theses = data.theses.filter(t => t.id !== id);
  data.versions = data.versions.filter(v => v.thesisId !== id);

  // 鏇存柊褰撳墠璁烘枃
  if (data.currentThesisId === id) {
    data.currentThesisId = data.theses[0]?.id || null;
  }

  return saveData(data);
});

// 璁剧疆褰撳墠婵€娲荤殑璁烘枃
ipcMain.handle('set-current-thesis', async (_event, id: string) => {
  log.info('IPC: set-current-thesis', id);
  const data = loadData();

  const thesis = data.theses.find(t => t.id === id);
  if (thesis) {
    data.currentThesisId = id;
    return saveData(data);
  }
  return false;
});

// 鑾峰彇褰撳墠璁烘枃ID
ipcMain.handle('get-current-thesis', async () => {
  log.info('IPC: get-current-thesis');
  const data = ensureDefaultThesis();
  return data.currentThesisId;
});

// ==================== Version IPC Handlers (淇敼) ====================

// 鑾峰彇鐗堟湰鍒楄〃锛堝彲閫夊弬鏁帮細thesisId锛?
ipcMain.handle('get-versions', async (_event, thesisId?: string) => {
  log.info('IPC: get-versions', thesisId);
  const data = ensureDefaultThesis();

  if (thesisId) {
    return data.versions.filter(v => v.thesisId === thesisId);
  }
  return data.versions;
});

// 娣诲姞鐗堟湰锛堥渶瑕?thesisId锛?
ipcMain.handle('add-version', async (_event, versionData: any, thesisId?: string) => {
  log.info('IPC: add-version', versionData, thesisId);
  const data = ensureDefaultThesis();

  // 纭畾鐩爣璁烘枃ID
  const targetThesisId = thesisId || data.currentThesisId;
  if (!targetThesisId) {
    log.error('No target thesis for add-version');
    return false;
  }

  const newVersion: Version = {
    id: generateId(),
    thesisId: targetThesisId,
    version: versionData.version,
    date: versionData.date,
    changes: versionData.changes,
    focus: versionData.focus,
    filePath: versionData.filePath,
    fileName: versionData.fileName,
    fileType: versionData.fileType
  };

  // 濡傛灉鏈夋枃浠讹紝澶嶅埗鍒拌鏂囩洰褰?
  if (versionData.filePath && fs.existsSync(versionData.filePath)) {
    const thesisFilesDir = getThesisFilesDir(targetThesisId);
    const ext = path.extname(versionData.filePath);
    const newFileName = `version_${newVersion.id}${ext}`;
    const newFilePath = path.join(thesisFilesDir, newFileName);

    try {
      fs.copyFileSync(versionData.filePath, newFilePath);
      newVersion.filePath = newFilePath;
    } catch (e) {
      log.error('Error copying file:', e);
    }
  }

  data.versions.unshift(newVersion);

  // 鏇存柊璁烘枃鐨勬洿鏂版椂闂?
  const thesisIndex = data.theses.findIndex(t => t.id === targetThesisId);
  if (thesisIndex !== -1) {
    data.theses[thesisIndex].updatedAt = new Date().toISOString();
  }

  return saveData(data);
});

// 鏇存柊鐗堟湰
ipcMain.handle('update-version', async (_event, id: string, updates: any) => {
  log.info('IPC: update-version', id, updates);
  const data = loadData();
  const index = data.versions.findIndex(v => v.id === id);

  if (index !== -1) {
    data.versions[index] = { ...data.versions[index], ...updates };

    // 濡傛灉鏇存柊浜嗘枃浠讹紝闇€瑕佺Щ鍔ㄥ埌姝ｇ‘鐨勮鏂囩洰褰?
    if (updates.filePath && updates.filePath !== data.versions[index].filePath) {
      const thesisId = data.versions[index].thesisId;
      const thesisFilesDir = getThesisFilesDir(thesisId);
      const ext = path.extname(updates.filePath);
      const newFileName = `version_${id}${ext}`;
      const newFilePath = path.join(thesisFilesDir, newFileName);

      try {
        if (fs.existsSync(updates.filePath)) {
          fs.copyFileSync(updates.filePath, newFilePath);
          data.versions[index].filePath = newFilePath;
        }
      } catch (e) {
        log.error('Error copying updated file:', e);
      }
    }

    return saveData(data);
  }
  return false;
});

// 鍒犻櫎鐗堟湰
ipcMain.handle('delete-version', async (_event, id: string) => {
  log.info('IPC: delete-version', id);
  const data = loadData();

  // 鍒犻櫎鐗堟湰鏂囦欢
  const version = data.versions.find(v => v.id === id);
  if (version?.filePath && fs.existsSync(version.filePath)) {
    try {
      fs.unlinkSync(version.filePath);
    } catch (e) {
      log.error('Error deleting version file:', e);
    }
  }

  data.versions = data.versions.filter(v => v.id !== id);
  return saveData(data);
});

// ==================== 鏂囦欢鎿嶄綔 IPC Handlers ====================

// 閫夋嫨鏂囦欢
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

// 澶嶅埗鏂囦欢锛堝凡搴熷純锛屼娇鐢ㄥ唴閮ㄥ鐞嗭級
ipcMain.handle('copy-file', async (_event, sourcePath: string, versionId: string, thesisId: string) => {
  log.info('IPC: copy-file', sourcePath, versionId, thesisId);
  try {
    const ext = path.extname(sourcePath);
    const thesisFilesDir = getThesisFilesDir(thesisId);
    const destFileName = `version_${versionId}${ext}`;
    const destPath = path.join(thesisFilesDir, destFileName);

    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  } catch (error) {
    log.error('Error copying file:', error);
    return null;
  }
});

// 鎵撳紑鏂囦欢
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

// 鑾峰彇鏁版嵁鐩綍
ipcMain.handle('get-data-dir', async () => {
  return getDataDirStatus();
});

// 閫夋嫨鏁版嵁鐩綍锛堝凡搴熷純锛屼娇鐢ㄥ浐瀹氳矾寰勶級
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

  const session = createEditSession(params, dataDir);

  const openResult = await shell.openPath(session.editFilePath);
  if (openResult) {
    log.error('Failed to open file:', openResult);
    clearSession(dataDir, true);
    throw new Error(`未找到可打开此文件的程序: ${openResult}`);
  }

  if (session.autoArchive) {
    startLockFileWatch(
      session,
      () => {
        const archived = archiveSession(dataDir);
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
  const archived = archiveSession(dataDir);
  if (archived) {
    return true;
  }
  return false;
});

ipcMain.handle('get-pending-edit-session', async () => {
  const dataDir = getDataDir();
  return loadPersistedSession(dataDir);
});

ipcMain.handle('resolve-pending-edit-session', async (_event, keep: boolean) => {
  const dataDir = getDataDir();
  if (keep) {
    const archived = archiveSession(dataDir);
    return archived !== null;
  }

  clearSession(dataDir, true);
  return true;
});

// 鍒濆鍖栨暟鎹紙搴旂敤鍚姩鏃惰皟鐢級
export function initializeApp(): void {
  log.info('Initializing app data...');
  ensureDefaultThesis();
  const dataDir = getDataDir();
  const persisted = loadPersistedSession(dataDir);
  if (persisted) {
    log.info('Found unfinished edit session:', persisted.newVersionId);
  }
  log.info('App data initialized');
}
