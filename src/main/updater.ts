import { app, ipcMain, shell, BrowserWindow } from 'electron';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import log from 'electron-log';

const GITHUB_REPO = 'yinchui/Thesis-Progress-Tracker';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl?: string;
  releaseNotes?: string;
}

function compareVersions(current: string, latest: string): boolean {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const l = latest.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const cv = c[i] || 0;
    const lv = l[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

function findAssetUrl(assets: any[]): string | undefined {
  const platform = process.platform;
  const arch = process.arch;

  for (const asset of assets) {
    const name: string = asset.name || '';
    if (platform === 'darwin') {
      if (arch === 'arm64' && name.endsWith('-arm64.dmg')) return asset.browser_download_url;
      if (arch === 'x64' && name.endsWith('-x64.dmg')) return asset.browser_download_url;
    } else if (platform === 'win32') {
      if (name.includes('-Setup-') && name.endsWith('.exe')) return asset.browser_download_url;
    }
  }
  // Fallback: first dmg/exe
  for (const asset of assets) {
    const name: string = asset.name || '';
    if (platform === 'darwin' && name.endsWith('.dmg')) return asset.browser_download_url;
    if (platform === 'win32' && name.endsWith('.exe')) return asset.browser_download_url;
  }
  return undefined;
}

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'User-Agent': 'Thesis-Progress-Tracker' },
    };
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location!).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function checkForUpdate(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();
  try {
    const release = await fetchJSON(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    const latestVersion = (release.tag_name || '').replace(/^v/, '');
    const hasUpdate = compareVersions(currentVersion, latestVersion);
    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      downloadUrl: hasUpdate ? findAssetUrl(release.assets || []) : undefined,
      releaseNotes: release.body || undefined,
    };
  } catch (error) {
    log.error('Check for update failed:', error);
    return { hasUpdate: false, currentVersion, latestVersion: currentVersion };
  }
}

function downloadFile(url: string, destPath: string, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'Thesis-Progress-Tracker' } };
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location!, destPath, onProgress).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let receivedBytes = 0;
      const file = fs.createWriteStream(destPath);
      res.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          onProgress(Math.round((receivedBytes / totalBytes) * 100));
        }
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
    }).on('error', reject);
  });
}

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('check-for-update', async () => {
  log.info('IPC: check-for-update');
  return checkForUpdate();
});

ipcMain.handle('download-update', async (_event, downloadUrl: string) => {
  log.info('IPC: download-update', downloadUrl);
  const ext = process.platform === 'darwin' ? '.dmg' : '.exe';
  const destPath = path.join(os.tmpdir(), `thesis-tracker-update${ext}`);

  const windows = BrowserWindow.getAllWindows();
  const sendProgress = (percent: number) => {
    if (windows.length > 0) {
      windows[0].webContents.send('update-download-progress', percent);
    }
  };

  try {
    await downloadFile(downloadUrl, destPath, sendProgress);
    await shell.openPath(destPath);
    return { success: true, filePath: destPath };
  } catch (error) {
    log.error('Download update failed:', error);
    return { success: false, error: String(error) };
  }
});
