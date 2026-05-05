import axios from 'axios';
import { Platform } from 'react-native';
import { WebDAVConfig } from './storage';

export interface FileEntry {
  name: string;
  path: string;
  date: string;
  size: number;
  isFolder: boolean;
}

// On web (localhost), use local proxy to bypass CORS. On native, call directly.
function getBaseUrl(serverUrl: string): string {
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    try {
      const parsed = new URL(serverUrl);
      const pathPrefix = parsed.pathname.replace(/\/$/, '');
      return `http://localhost:8083${pathPrefix}`;
    } catch {
      return 'http://localhost:8083';
    }
  }
  return serverUrl.replace(/\/$/, '');
}

function getAuthHeaders(config: WebDAVConfig) {
  const token = btoa(`${config.username}:${config.password}`);
  return { Authorization: `Basic ${token}` };
}

function encodePath(path: string): string {
  return path.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

// Files to hide at all levels
const HIDDEN_FILES = ['theses-index.json', 'data.json.backup', 'versions.json'];

export async function testConnection(config: WebDAVConfig): Promise<boolean> {
  try {
    const base = getBaseUrl(config.url);
    const response = await axios({
      method: 'PROPFIND',
      url: `${base}${encodePath(config.dataPath)}`,
      headers: { ...getAuthHeaders(config), Depth: '0', 'Content-Type': 'application/xml' },
      validateStatus: (status) => status < 500,
    });
    return response.status === 207 || response.status === 200;
  } catch {
    return false;
  }
}

function parseEntries(xml: string, currentPath: string): FileEntry[] {
  const entries: FileEntry[] = [];
  const decodedCurrent = decodeURIComponent(currentPath).replace(/\/$/, '');

  const blocks = xml.split(/<\/[^:>]*:?response>/i).filter(b => b.includes('href'));

  for (const block of blocks) {
    const hrefMatch = block.match(/<[^:>]*:?href>([^<]+)<\/[^:>]*:?href>/i);
    if (!hrefMatch) continue;

    const href = decodeURIComponent(hrefMatch[1].trim()).replace(/\/$/, '');

    // Skip the directory itself
    if (href.endsWith(decodedCurrent)) continue;

    const name = href.split('/').filter(Boolean).pop() || '';
    if (!name) continue;

    const isCollection = /collection/i.test(block);
    const sizeMatch = block.match(/<[^:>]*:?getcontentlength>(\d+)<\/[^:>]*:?getcontentlength>/i);
    const dateMatch = block.match(/<[^:>]*:?getlastmodified>([^<]+)<\/[^:>]*:?getlastmodified>/i);

    // Extract the path relative to /dav prefix
    const pathMatch = href.match(/^\/dav(\/.*)/);
    const filePath = pathMatch ? pathMatch[1] : href;

    entries.push({
      name,
      path: filePath,
      date: dateMatch ? dateMatch[1] : '',
      size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
      isFolder: isCollection,
    });
  }

  return entries.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export async function listFolder(config: WebDAVConfig, folderPath: string): Promise<FileEntry[]> {
  const base = getBaseUrl(config.url);
  const response = await axios({
    method: 'PROPFIND',
    url: `${base}${encodePath(folderPath)}`,
    headers: { ...getAuthHeaders(config), Depth: '1', 'Content-Type': 'application/xml' },
  });

  const entries = parseEntries(response.data, folderPath);
  return entries.filter(e => !HIDDEN_FILES.includes(e.name));
}

// Download a file — web: triggers browser download; native: saves to cache then opens share sheet
export async function downloadFile(config: WebDAVConfig, filePath: string, fileName: string): Promise<void> {
  const base = getBaseUrl(config.url);
  const url = `${base}${encodePath(filePath)}`;
  const token = btoa(`${config.username}:${config.password}`);

  if (Platform.OS === 'web') {
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${token}` },
    });
    if (!response.ok) throw new Error(`下载失败: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  } else {
    // Native: use expo-file-system to download, then share/open
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');

    const localUri = `${FileSystem.cacheDirectory}${fileName}`;
    const result = await FileSystem.downloadAsync(url, localUri, {
      headers: { Authorization: `Basic ${token}` },
    });
    if (result.status !== 200) throw new Error(`下载失败: ${result.status}`);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: fileName,
      });
    } else {
      throw new Error('当前设备不支持文件分享');
    }
  }
}

// Keep for backward compat
export async function getVersions(config: WebDAVConfig) {
  return listFolder(config, config.dataPath);
}
