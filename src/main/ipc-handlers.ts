import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import log from 'electron-log';
import { resolveDataDir } from './path-resolver';

// ==================== 类型定义 ====================

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
  changes: string;
  focus: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
}

export interface AppData {
  theses: Thesis[];
  currentThesisId: string | null;
  versions: Version[];
}

// ==================== 工具函数 ====================

// 获取数据目录
function getDataDir(): string {
  const dataDir = resolveDataDir((name) => app.getPath(name));
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// 获取数据文件路径
function getDataFilePath(): string {
  return path.join(getDataDir(), 'data.json');
}

// 获取论文文件存储目录
function getThesisFilesDir(thesisId: string): string {
  const dir = path.join(getDataDir(), 'files', `thesis_${thesisId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 生成 UUID
function generateId(): string {
  return crypto.randomUUID();
}

// 加载数据
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

// 保存数据
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

// 创建默认论文（向后兼容）
function ensureDefaultThesis(): AppData {
  let data = loadData();

  // 如果没有论文，创建一个默认论文
  if (data.theses.length === 0) {
    const defaultThesis: Thesis = {
      id: generateId(),
      title: '默认论文',
      description: '自动创建的默认论文',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 尝试迁移旧版本数据
    const oldVersionsFile = path.join(getDataDir(), 'versions.json');
    if (fs.existsSync(oldVersionsFile)) {
      try {
        const oldVersions = JSON.parse(fs.readFileSync(oldVersionsFile, 'utf-8'));
        if (Array.isArray(oldVersions) && oldVersions.length > 0) {
          // 为旧版本添加 thesisId
          data.versions = oldVersions.map((v: any) => ({
            ...v,
            thesisId: defaultThesis.id
          }));
          log.info(`Migrated ${oldVersions.length} old versions to default thesis`);

          // 移动旧文件到新目录
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
        // 删除旧版本文件
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

  // 确保当前论文有效
  if (!data.currentThesisId || !data.theses.find(t => t.id === data.currentThesisId)) {
    data.currentThesisId = data.theses[0]?.id || null;
    saveData(data);
  }

  return data;
}

// ==================== Thesis IPC Handlers ====================

// 获取所有论文列表
ipcMain.handle('get-theses', async () => {
  log.info('IPC: get-theses');
  const data = ensureDefaultThesis();
  return data.theses;
});

// 创建新论文
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

  // 创建论文文件目录
  getThesisFilesDir(newThesis.id);

  data.theses.push(newThesis);
  data.currentThesisId = newThesis.id;

  if (saveData(data)) {
    return newThesis;
  }
  return null;
});

// 更新论文信息
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

// 删除论文（同时删除所有版本和文件）
ipcMain.handle('delete-thesis', async (_event, id: string) => {
  log.info('IPC: delete-thesis', id);
  const data = loadData();

  // 检查是否是最后一个论文
  if (data.theses.length <= 1) {
    log.warn('Cannot delete the last thesis');
    return false;
  }

  // 删除论文的所有版本文件
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

  // 删除论文文件目录
  const thesisFilesDir = path.join(getDataDir(), 'files', `thesis_${id}`);
  if (fs.existsSync(thesisFilesDir)) {
    try {
      fs.rmSync(thesisFilesDir, { recursive: true, force: true });
    } catch (e) {
      log.error('Error deleting thesis files directory:', e);
    }
  }

  // 删除论文及其版本
  data.theses = data.theses.filter(t => t.id !== id);
  data.versions = data.versions.filter(v => v.thesisId !== id);

  // 更新当前论文
  if (data.currentThesisId === id) {
    data.currentThesisId = data.theses[0]?.id || null;
  }

  return saveData(data);
});

// 设置当前激活的论文
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

// 获取当前论文ID
ipcMain.handle('get-current-thesis', async () => {
  log.info('IPC: get-current-thesis');
  const data = ensureDefaultThesis();
  return data.currentThesisId;
});

// ==================== Version IPC Handlers (修改) ====================

// 获取版本列表（可选参数：thesisId）
ipcMain.handle('get-versions', async (_event, thesisId?: string) => {
  log.info('IPC: get-versions', thesisId);
  const data = ensureDefaultThesis();

  if (thesisId) {
    return data.versions.filter(v => v.thesisId === thesisId);
  }
  return data.versions;
});

// 添加版本（需要 thesisId）
ipcMain.handle('add-version', async (_event, versionData: any, thesisId?: string) => {
  log.info('IPC: add-version', versionData, thesisId);
  const data = ensureDefaultThesis();

  // 确定目标论文ID
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

  // 如果有文件，复制到论文目录
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

  // 更新论文的更新时间
  const thesisIndex = data.theses.findIndex(t => t.id === targetThesisId);
  if (thesisIndex !== -1) {
    data.theses[thesisIndex].updatedAt = new Date().toISOString();
  }

  return saveData(data);
});

// 更新版本
ipcMain.handle('update-version', async (_event, id: string, updates: any) => {
  log.info('IPC: update-version', id, updates);
  const data = loadData();
  const index = data.versions.findIndex(v => v.id === id);

  if (index !== -1) {
    data.versions[index] = { ...data.versions[index], ...updates };

    // 如果更新了文件，需要移动到正确的论文目录
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

// 删除版本
ipcMain.handle('delete-version', async (_event, id: string) => {
  log.info('IPC: delete-version', id);
  const data = loadData();

  // 删除版本文件
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

// ==================== 文件操作 IPC Handlers ====================

// 选择文件
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

// 复制文件（已废弃，使用内部处理）
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

// 打开文件
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

// 获取数据目录
ipcMain.handle('get-data-dir', async () => {
  return getDataDir();
});

// 选择数据目录（已废弃，使用固定路径）
ipcMain.handle('select-data-dir', async () => {
  log.info('IPC: select-data-dir (deprecated)');
  return getDataDir();
});

// 初始化数据（应用启动时调用）
export function initializeApp(): void {
  log.info('Initializing app data...');
  ensureDefaultThesis();
  log.info('App data initialized');
}
