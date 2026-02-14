import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info('Application starting...');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;

// Get data directory
function getDataDir(): string {
  // Use fixed path E:\AI项目\论文\data
  const dataDir = path.join('E:', path.sep, 'AI项目', '论文', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

// Get versions file path
function getVersionsFilePath(): string {
  return path.join(getDataDir(), 'versions.json');
}

// Load versions from file
function loadVersions(): any[] {
  const filePath = getVersionsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    log.error('Error loading versions:', error);
  }
  return [];
}

// Save versions to file
function saveVersions(versions: any[]): boolean {
  const filePath = getVersionsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(versions, null, 2), 'utf-8');
    return true;
  } catch (error) {
    log.error('Error saving versions:', error);
    return false;
  }
}

function createWindow() {
  log.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    log.info('Main window shown');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-versions', async () => {
  log.info('IPC: get-versions');
  return loadVersions();
});

ipcMain.handle('add-version', async (_event, versionData: any) => {
  log.info('IPC: add-version', versionData);
  const versions = loadVersions();
  versions.unshift(versionData); // Add to beginning
  return saveVersions(versions);
});

ipcMain.handle('update-version', async (_event, id: string, updates: any) => {
  log.info('IPC: update-version', id, updates);
  const versions = loadVersions();
  const index = versions.findIndex((v: any) => v.id === id);
  if (index !== -1) {
    versions[index] = { ...versions[index], ...updates };
    return saveVersions(versions);
  }
  return false;
});

ipcMain.handle('delete-version', async (_event, id: string) => {
  log.info('IPC: delete-version', id);
  const versions = loadVersions();
  const filtered = versions.filter((v: any) => v.id !== id);
  return saveVersions(filtered);
});

ipcMain.handle('select-file', async () => {
  log.info('IPC: select-file');
  const result = await dialog.showOpenDialog(mainWindow!, {
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

ipcMain.handle('copy-file', async (_event, sourcePath: string, versionId: string) => {
  log.info('IPC: copy-file', sourcePath, versionId);
  try {
    const ext = path.extname(sourcePath);
    const dataDir = getDataDir();
    const destFileName = `thesis_${versionId}${ext}`;
    const destPath = path.join(dataDir, destFileName);

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
  return getDataDir();
});

ipcMain.handle('select-data-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: '选择数据存储目录',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

app.whenReady().then(() => {
  log.info('App ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
