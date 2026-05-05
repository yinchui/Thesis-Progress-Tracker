# 移动端 Monorepo 架构设计

## 项目概述

为现有的论文进度管理器（Thesis Progress Tracker）添加移动端支持，采用 Monorepo 架构实现代码共享。移动端为只读查看应用，通过坚果云 WebDAV API 读取桌面端同步的数据。

## 需求总结

### 功能需求
- **只读查看**：查看论文版本历史和详情
- **文件下载**：下载论文文件到本地
- **文件预览**：PDF 内置预览，其他格式调用系统应用
- **排序功能**：按时间正序/倒序排列版本
- **离线支持**：缓存版本列表，文件按需下载

### 技术需求
- **平台支持**：iOS + Android（优先开发 Android）
- **技术栈**：React Native
- **项目结构**：Monorepo + 共享代码库
- **数据同步**：通过坚果云 WebDAV API
- **认证方式**：手动配置 WebDAV 账号密码

## 整体架构

### 目录结构

```
论文管理/
├── Thesis-Progress-Tracker/          # 现有桌面端（保持不变）
│   ├── src/
│   │   ├── main/                     # Electron 主进程
│   │   ├── preload/                  # 预加载脚本
│   │   └── renderer/                 # React 前端
│   ├── package.json
│   ├── electron-builder.json
│   └── ...
├── mobile/                            # React Native 移动端
│   ├── android/                       # Android 原生代码
│   ├── ios/                           # iOS 原生代码（后期）
│   ├── src/
│   │   ├── screens/                   # 页面
│   │   │   ├── LoginScreen.tsx        # WebDAV 配置页
│   │   │   ├── TimelineScreen.tsx     # 版本列表页
│   │   │   ├── DetailScreen.tsx       # 版本详情页
│   │   │   ├── PDFViewerScreen.tsx    # PDF 预览页
│   │   │   └── SettingsScreen.tsx     # 设置页
│   │   ├── components/                # 组件
│   │   │   ├── VersionCard.tsx        # 版本卡片
│   │   │   ├── LoadingSpinner.tsx     # 加载指示器
│   │   │   └── ErrorBoundary.tsx      # 错误边界
│   │   ├── services/                  # 服务层
│   │   │   ├── webdav.ts              # WebDAV 客户端
│   │   │   ├── cache.ts               # 缓存管理
│   │   │   ├── fileDownload.ts        # 文件下载
│   │   │   └── storage.ts             # 本地存储
│   │   ├── navigation/                # 导航配置
│   │   │   └── AppNavigator.tsx
│   │   ├── hooks/                     # 自定义 Hooks
│   │   │   ├── useVersions.ts
│   │   │   └── useWebDAV.ts
│   │   ├── utils/                     # 工具函数
│   │   │   └── constants.ts
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── metro.config.js
│   └── app.json
├── shared/                            # 共享代码库
│   ├── src/
│   │   ├── types/                     # TypeScript 类型定义
│   │   │   ├── Version.ts             # 版本数据类型
│   │   │   ├── Config.ts              # 配置类型
│   │   │   └── index.ts
│   │   ├── models/                    # 数据模型
│   │   │   ├── ThesisData.ts          # 论文数据模型
│   │   │   └── index.ts
│   │   ├── utils/                     # 工具函数
│   │   │   ├── dateFormat.ts          # 日期格式化
│   │   │   ├── fileUtils.ts           # 文件工具
│   │   │   ├── validation.ts          # 数据验证
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── package.json                       # 根 workspace 配置
├── .gitignore
└── README.md
```

### 技术栈

**移动端核心：**
- React Native 0.74+
- TypeScript 5.3+
- React Navigation 6.x（页面导航）
- @react-native-async-storage/async-storage（本地存储）
- react-native-keychain（密码加密存储）

**WebDAV 与文件处理：**
- axios（WebDAV 客户端，通过 HTTP 方法实现 WebDAV 协议）
- react-native-fs（文件系统操作和流式下载）
- react-native-pdf（PDF 预览）
- react-native-file-viewer（其他格式文件查看）

**共享层：**
- TypeScript
- 纯 JS/TS 逻辑（无平台依赖）

**开发工具：**
- npm workspaces（Monorepo 管理）
- ESLint + Prettier（代码规范）
- Jest（单元测试）


## 数据流与同步机制

### WebDAV 数据结构

桌面端需要将数据同步到坚果云，建议的目录结构：

```
坚果云/论文管理/
├── data/
│   ├── versions.json              # 版本元数据
│   └── files/                     # 论文文件
│       ├── thesis_v1.0_20260401_abc123.pdf
│       ├── thesis_v2.0_20260410_def456.pdf
│       └── ...
```

**versions.json 格式：**
```json
{
  "schemaVersion": "1.0",
  "dataVersion": 123,
  "versions": [
    {
      "id": "uuid-1",
      "version": "v2.0",
      "date": "2026-04-10T10:30:00.000Z",
      "changes": "修改了第三章的实验部分，补充了数据分析",
      "focus": "需要进一步完善结论部分",
      "fileName": "thesis_v2.0_20260410_def456.pdf",
      "filePath": "files/thesis_v2.0_20260410_def456.pdf",
      "fileSize": 2415616
    }
  ],
  "lastModified": "2026-04-10T10:30:00.000Z"
}
```

**字段说明：**
- `schemaVersion`：数据格式版本，用于未来格式升级时的兼容性处理
- `dataVersion`：数据版本号，每次更新递增，用于检测数据是否有更新
- `lastModified`：最后修改时间

### 数据同步流程

**桌面端操作流程：**
```
1. 用户上传新版本
   ├─ 保存到本地 data/ 目录
   ├─ 更新 versions.json（递增 dataVersion）
   └─ 坚果云客户端自动同步到云端

2. 桌面端改造方案
   ├─ 方案 A：依赖坚果云客户端（推荐）
   │   ├─ 在设置中添加"数据目录"配置项
   │   ├─ 引导用户将数据目录设置为坚果云同步文件夹
   │   ├─ 提供配置向导和说明文档
   │   ├─ 优点：无需开发，利用现有坚果云客户端
   │   └─ 缺点：需要用户手动配置
   └─ 方案 B：桌面端集成 WebDAV 上传
       ├─ 在桌面端添加 WebDAV 配置选项
       ├─ 每次保存版本时自动上传到坚果云
       ├─ 优点：用户体验更好，自动化
       └─ 缺点：需要开发桌面端 WebDAV 客户端
```

**建议实施方案 A**，在桌面端设置页面添加详细的配置说明和向导。

**移动端读取流程：**
```
1. 首次启动
   ├─ 用户配置 WebDAV 连接信息
   ├─ 测试连接并读取 versions.json
   ├─ 解析版本列表
   └─ 缓存到本地 AsyncStorage

2. 后续启动
   ├─ 先显示缓存的版本列表（快速启动）
   ├─ 后台从 WebDAV 拉取最新 versions.json
   ├─ 对比本地缓存，如有更新则刷新界面
   └─ 更新本地缓存

3. 下拉刷新
   ├─ 强制从 WebDAV 重新拉取 versions.json
   └─ 更新缓存和界面

4. 文件下载
   ├─ 用户点击"下载"按钮
   ├─ 通过 WebDAV 下载文件到本地
   ├─ 显示下载进度
   └─ 保存到 DocumentDirectory/thesis_files/
```

### 缓存策略

**版本列表缓存：**
- **存储位置**：AsyncStorage
- **缓存键**：`@thesis_tracker:versions`
- **缓存内容**：完整的 ThesisData 对象
- **更新策略**：
  - 首次启动：从 WebDAV 拉取
  - 后续启动：先显示缓存，后台刷新
  - 下拉刷新：强制重新拉取
  - 缓存有效期：无限期（依赖手动刷新）

**文件缓存：**
- **存储位置**：`DocumentDirectory/thesis_files/`
- **缓存策略**：不自动缓存，用户主动下载
- **缓存管理**：
  - 显示已缓存文件列表
  - 支持删除单个文件
  - 支持清空所有缓存
  - 显示缓存占用空间
- **离线访问**：已缓存文件可离线打开

**缓存状态标识：**
```typescript
interface CacheStatus {
  isCached: boolean;           // 是否已缓存
  localPath?: string;          // 本地路径
  cachedAt?: string;           // 缓存时间
  fileSize?: number;           // 文件大小
}
```

### 数据模型

**shared/src/types/Version.ts：**
```typescript
export interface Version {
  id: string;                  // 唯一标识
  version: string;             // 版本号（如 v2.0）
  date: string;                // ISO 8601 格式日期
  changes: string;             // 修改内容
  focus: string;               // 当前重点
  fileName: string;            // 文件名
  filePath: string;            // 相对路径（相对于 data/ 目录）
  fileSize?: number;           // 文件大小（字节）
}

export interface ThesisData {
  versions: Version[];         // 版本列表
  lastModified: string;        // 最后修改时间
}
```

**shared/src/types/Config.ts：**
```typescript
export interface WebDAVConfig {
  serverUrl: string;           // WebDAV 服务器地址
  username: string;            // 用户名（邮箱）
  password: string;            // 应用密码
  dataPath: string;            // 数据目录路径（如 /论文管理/data/）
}

export interface AppConfig {
  webdav: WebDAVConfig;
  sortOrder: 'asc' | 'desc';   // 排序方式
  lastSyncTime?: string;       // 最后同步时间
}
```


## 核心功能设计

### 1. WebDAV 配置与认证（LoginScreen）

**首次启动流程：**
```
LoginScreen
├─ 显示欢迎信息和配置说明
├─ 输入表单
│   ├─ WebDAV 服务器地址（默认：https://dav.jianguoyun.com/dav/）
│   ├─ 坚果云账号（邮箱）
│   ├─ 应用密码（需在坚果云网页端生成）
│   └─ 数据目录路径（如：/论文管理/data/）
├─ "测试连接"按钮
│   ├─ 验证 WebDAV 连接
│   ├─ 检查 versions.json 是否存在
│   ├─ 成功：保存配置并进入主界面
│   └─ 失败：显示错误信息和解决建议
└─ "如何获取应用密码"帮助链接
```

**配置存储：**
- 使用 `@react-native-async-storage/async-storage` 存储非敏感信息
- 使用 `react-native-keychain` 加密存储密码
- 配置键：`@thesis_tracker:webdav_config`
- 支持"退出登录"功能（清除配置）

**错误处理：**
- 网络连接失败：提示检查网络
- 认证失败：提示检查账号密码
- 文件不存在：提示检查数据目录路径
- 超时：提示重试

**UI 设计：**
```
┌─────────────────────────────┐
│   论文进度管理器 - 移动版    │
│                             │
│   [Logo]                    │
│                             │
│   WebDAV 配置               │
│   ┌─────────────────────┐   │
│   │ 服务器地址           │   │
│   └─────────────────────┘   │
│   ┌─────────────────────┐   │
│   │ 账号（邮箱）         │   │
│   └─────────────────────┘   │
│   ┌─────────────────────┐   │
│   │ 应用密码             │   │
│   └─────────────────────┘   │
│   ┌─────────────────────┐   │
│   │ 数据目录路径         │   │
│   └─────────────────────┘   │
│                             │
│   [测试连接]                │
│                             │
│   如何获取应用密码？         │
└─────────────────────────────┘
```

### 2. 版本列表页（TimelineScreen）

**UI 布局：**
```
┌─────────────────────────────┐
│  论文进度管理器              │  ← Header
│  [刷新] [排序▼] [设置]      │
├─────────────────────────────┤
│  共 15 个版本                │  ← 统计信息
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ v2.0    2026-04-10    │  │  ← VersionCard
│  │ 修改了第三章实验部分... │  │
│  │ 📄 PDF  2.3 MB        │  │
│  │ [✓ 已缓存]            │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ v1.5    2026-04-05    │  │
│  │ 添加了参考文献...      │  │
│  │ 📄 PDF  2.1 MB        │  │
│  │ [下载]                │  │
│  └───────────────────────┘  │
│         ...                 │
└─────────────────────────────┘
```

**功能特性：**
- **下拉刷新**：从 WebDAV 重新拉取 versions.json
- **排序切换**：点击排序按钮切换正序/倒序
- **版本卡片**：
  - 显示版本号、日期、修改内容摘要
  - 显示文件类型和大小
  - 显示缓存状态（已缓存/未缓存）
  - 点击卡片进入详情页
- **加载状态**：
  - 首次加载：显示骨架屏
  - 刷新中：顶部显示加载指示器
  - 加载失败：显示错误信息和重试按钮
- **空状态**：无版本时显示提示信息

**VersionCard 组件：**
```typescript
interface VersionCardProps {
  version: Version;
  isCached: boolean;
  onPress: () => void;
}
```

### 3. 版本详情页（DetailScreen）

**UI 布局：**
```
┌─────────────────────────────┐
│  ← 返回      v2.0           │  ← Header
├─────────────────────────────┤
│  版本信息                    │
│  ┌─────────────────────────┐│
│  │ 版本号：v2.0             ││
│  │ 日期：2026-04-10 10:30  ││
│  └─────────────────────────┘│
│                             │
│  修改内容                    │
│  ┌─────────────────────────┐│
│  │ 修改了第三章的实验部分，  ││
│  │ 补充了数据分析，优化了   ││
│  │ 图表展示...              ││
│  └─────────────────────────┘│
│                             │
│  当前重点                    │
│  ┌─────────────────────────┐│
│  │ 需要进一步完善结论部分，  ││
│  │ 补充理论分析...          ││
│  └─────────────────────────┘│
│                             │
│  文件信息                    │
│  ┌─────────────────────────┐│
│  │ 📄 thesis_v2.0.pdf      ││
│  │ 大小：2.3 MB            ││
│  │ 状态：已缓存             ││
│  └─────────────────────────┘│
│                             │
│  [打开文件]  [分享]          │
│  或                          │
│  [下载文件 (2.3 MB)]        │
└─────────────────────────────┘
```

**功能特性：**
- **显示完整信息**：版本号、日期、修改内容、当前重点
- **文件操作**：
  - 已缓存：显示"打开文件"和"分享"按钮
  - 未缓存：显示"下载文件"按钮（带文件大小）
  - 下载中：显示进度条和"取消"按钮
- **打开文件**：
  - PDF：跳转到 PDFViewerScreen
  - 其他格式：调用系统应用
- **分享文件**：调用系统分享功能

### 4. PDF 预览页（PDFViewerScreen）

**UI 布局：**
```
┌─────────────────────────────┐
│  ← 返回  thesis_v2.0.pdf    │  ← Header
│  [分享]                      │
├─────────────────────────────┤
│                             │
│                             │
│      PDF 内容显示区域        │
│                             │
│                             │
├─────────────────────────────┤
│  第 1 页 / 共 50 页          │  ← Footer
│  [◀] [▶]                    │
└─────────────────────────────┘
```

**功能特性：**
- 使用 `react-native-pdf` 组件
- 支持缩放、翻页
- 显示当前页码和总页数
- 支持横屏查看
- 加载进度提示
- 分享按钮

### 5. 设置页（SettingsScreen）

**UI 布局：**
```
┌─────────────────────────────┐
│  ← 返回      设置            │
├─────────────────────────────┤
│  账号信息                    │
│  ┌─────────────────────────┐│
│  │ user@example.com        ││
│  │ [退出登录]              ││
│  └─────────────────────────┘│
│                             │
│  缓存管理                    │
│  ┌─────────────────────────┐│
│  │ 已缓存文件：3 个         ││
│  │ 占用空间：6.8 MB        ││
│  │ [查看缓存] [清空缓存]   ││
│  └─────────────────────────┘│
│                             │
│  同步信息                    │
│  ┌─────────────────────────┐│
│  │ 最后同步：5 分钟前       ││
│  │ [立即同步]              ││
│  └─────────────────────────┘│
│                             │
│  关于                        │
│  ┌─────────────────────────┐│
│  │ 版本：1.0.0             ││
│  │ [使用帮助] [反馈问题]   ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**功能特性：**
- 显示当前登录账号
- 退出登录（清除配置和缓存）
- 缓存管理（查看、清空）
- 手动同步
- 版本信息和帮助


## 技术实现细节

### 1. WebDAV 客户端封装

**mobile/src/services/webdav.ts：**
```typescript
import axios, { AxiosInstance } from 'axios';
import { ThesisData, Version } from '@thesis-tracker/shared';

export class WebDAVService {
  private client: AxiosInstance;
  private baseUrl: string;
  private dataPath: string;

  constructor(config: { url: string; username: string; password: string; dataPath: string }) {
    this.baseUrl = config.url;
    this.dataPath = config.dataPath;

    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: config.username,
        password: config.password,
      },
      timeout: 30000,
    });
  }

  // 测试连接
  async testConnection(): Promise<boolean> {
    try {
      await this.client.request({
        method: 'PROPFIND',
        url: this.dataPath,
        headers: { Depth: '0' },
      });
      return true;
    } catch (error) {
      throw new Error('连接失败：' + error.message);
    }
  }

  // 获取版本数据
  async getVersions(): Promise<ThesisData> {
    try {
      const response = await this.client.get(`${this.dataPath}/versions.json`);
      return response.data as ThesisData;
    } catch (error) {
      throw new Error('获取版本数据失败：' + error.message);
    }
  }

  // 获取文件下载 URL
  getFileUrl(filePath: string): string {
    return `${this.baseUrl}${this.dataPath}/${filePath}`;
  }

  // 下载文件
  async downloadFile(
    filePath: string,
    localPath: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const url = this.getFileUrl(filePath);

    const response = await this.client.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = progressEvent.loaded / progressEvent.total;
          onProgress(progress);
        }
      },
    });

    // 保存到本地（需要配合 react-native-fs）
    // 实际实现见 fileDownload.ts
  }

  // 检查文件是否存在
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.client.request({
        method: 'HEAD',
        url: `${this.dataPath}/${filePath}`,
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2. 缓存管理服务

**mobile/src/services/cache.ts：**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { ThesisData, Version } from '@thesis-tracker/shared';

const CACHE_KEYS = {
  VERSIONS: '@thesis_tracker:versions',
  LAST_SYNC: '@thesis_tracker:last_sync',
  CONFIG: '@thesis_tracker:config',
};

export class CacheService {
  private filesDir = `${RNFS.DocumentDirectoryPath}/thesis_files`;

  constructor() {
    this.ensureFilesDirExists();
  }

  // 确保文件目录存在
  private async ensureFilesDirExists() {
    const exists = await RNFS.exists(this.filesDir);
    if (!exists) {
      await RNFS.mkdir(this.filesDir);
    }
  }

  // 缓存版本列表
  async cacheVersions(data: ThesisData): Promise<void> {
    await AsyncStorage.setItem(CACHE_KEYS.VERSIONS, JSON.stringify(data));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  // 读取缓存的版本列表
  async getCachedVersions(): Promise<ThesisData | null> {
    const data = await AsyncStorage.getItem(CACHE_KEYS.VERSIONS);
    return data ? JSON.parse(data) : null;
  }

  // 获取最后同步时间
  async getLastSyncTime(): Promise<string | null> {
    return await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
  }

  // 检查文件是否已缓存
  async isFileCached(fileName: string): Promise<boolean> {
    const path = `${this.filesDir}/${fileName}`;
    return await RNFS.exists(path);
  }

  // 获取缓存文件路径
  getCachedFilePath(fileName: string): string {
    return `${this.filesDir}/${fileName}`;
  }

  // 获取所有缓存文件
  async getCachedFiles(): Promise<Array<{ name: string; size: number; path: string }>> {
    const files = await RNFS.readDir(this.filesDir);
    return files.map(file => ({
      name: file.name,
      size: file.size,
      path: file.path,
    }));
  }

  // 获取缓存总大小
  async getCacheSize(): Promise<number> {
    const files = await this.getCachedFiles();
    return files.reduce((total, file) => total + file.size, 0);
  }

  // 删除单个缓存文件
  async deleteCachedFile(fileName: string): Promise<void> {
    const path = `${this.filesDir}/${fileName}`;
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  }

  // 清空所有缓存
  async clearAllCache(): Promise<void> {
    // 清空版本列表缓存
    await AsyncStorage.removeItem(CACHE_KEYS.VERSIONS);
    await AsyncStorage.removeItem(CACHE_KEYS.LAST_SYNC);

    // 清空文件缓存
    const exists = await RNFS.exists(this.filesDir);
    if (exists) {
      await RNFS.unlink(this.filesDir);
      await RNFS.mkdir(this.filesDir);
    }
  }
}
```

### 3. 文件下载服务

**mobile/src/services/fileDownload.ts：**
```typescript
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { WebDAVService } from './webdav';
import { CacheService } from './cache';

export class FileDownloadService {
  constructor(
    private webdav: WebDAVService,
    private cache: CacheService
  ) {}

  // 下载文件
  async downloadFile(
    filePath: string,
    fileName: string,
    onProgress: (progress: number) => void
  ): Promise<string> {
    const localPath = this.cache.getCachedFilePath(fileName);
    const url = this.webdav.getFileUrl(filePath);

    // 使用 RNFS 下载
    const download = RNFS.downloadFile({
      fromUrl: url,
      toFile: localPath,
      progress: (res) => {
        const progress = res.bytesWritten / res.contentLength;
        onProgress(progress);
      },
      progressDivider: 10, // 每 10% 触发一次回调
    });

    await download.promise;
    return localPath;
  }

  // 打开文件
  async openFile(fileName: string, mimeType: string): Promise<void> {
    const localPath = this.cache.getCachedFilePath(fileName);
    const exists = await RNFS.exists(localPath);

    if (!exists) {
      throw new Error('文件不存在，请先下载');
    }

    // PDF 文件返回路径，由调用方跳转到 PDFViewerScreen
    if (mimeType === 'application/pdf') {
      return localPath;
    }

    // 其他格式使用系统应用打开
    try {
      await FileViewer.open(localPath, { showOpenWithDialog: true });
    } catch (error) {
      throw new Error('无法打开文件：' + error.message);
    }
  }

  // 获取文件 MIME 类型
  getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
```

### 4. 本地存储服务

**mobile/src/services/storage.ts：**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { WebDAVConfig, AppConfig } from '@thesis-tracker/shared';

export class StorageService {
  private CONFIG_KEY = '@thesis_tracker:app_config';

  // 保存 WebDAV 配置
  async saveWebDAVConfig(config: WebDAVConfig): Promise<void> {
    // 密码使用 Keychain 加密存储
    await Keychain.setGenericPassword(config.username, config.password, {
      service: 'thesis_tracker_webdav',
    });

    // 其他信息存储到 AsyncStorage
    const configWithoutPassword = {
      serverUrl: config.serverUrl,
      username: config.username,
      dataPath: config.dataPath,
    };

    const appConfig: Partial<AppConfig> = {
      webdav: configWithoutPassword as any,
      sortOrder: 'desc',
    };

    await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(appConfig));
  }

  // 读取 WebDAV 配置
  async getWebDAVConfig(): Promise<WebDAVConfig | null> {
    const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
    if (!configStr) return null;

    const appConfig: AppConfig = JSON.parse(configStr);

    // 从 Keychain 读取密码
    const credentials = await Keychain.getGenericPassword({
      service: 'thesis_tracker_webdav',
    });

    if (!credentials) return null;

    return {
      ...appConfig.webdav,
      password: credentials.password,
    };
  }

  // 清除配置（退出登录）
  async clearConfig(): Promise<void> {
    await AsyncStorage.removeItem(this.CONFIG_KEY);
    await Keychain.resetGenericPassword({
      service: 'thesis_tracker_webdav',
    });
  }

  // 保存排序方式
  async saveSortOrder(order: 'asc' | 'desc'): Promise<void> {
    const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
    if (configStr) {
      const config: AppConfig = JSON.parse(configStr);
      config.sortOrder = order;
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
    }
  }

  // 读取排序方式
  async getSortOrder(): Promise<'asc' | 'desc'> {
    const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
    if (configStr) {
      const config: AppConfig = JSON.parse(configStr);
      return config.sortOrder || 'desc';
    }
    return 'desc';
  }
}
```


### 5. 共享代码抽取

**shared/src/types/Version.ts：**
```typescript
// 从桌面端抽取的类型定义
export interface Version {
  id: string;
  version: string;
  date: string;
  changes: string;
  focus: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
}

export interface ThesisData {
  versions: Version[];
  lastModified: string;
}
```

**shared/src/utils/dateFormat.ts：**
```typescript
// 日期格式化工具
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const dateStr = formatDate(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return formatDate(dateString);
}
```

**shared/src/utils/fileUtils.ts：**
```typescript
// 文件工具函数
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

export function getFileIcon(fileName: string): string {
  const ext = getFileExtension(fileName);
  const icons: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    txt: '📃',
  };
  return icons[ext] || '📎';
}
```

**shared/src/utils/validation.ts：**
```typescript
// 数据验证
export function isValidWebDAVUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidDataPath(path: string): boolean {
  return path.startsWith('/') && path.length > 1;
}
```

### 6. 自定义 Hooks

**mobile/src/hooks/useVersions.ts：**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { ThesisData, Version } from '@thesis-tracker/shared';
import { WebDAVService } from '../services/webdav';
import { CacheService } from '../services/cache';

export function useVersions(webdav: WebDAVService, cache: CacheService) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载版本列表
  const loadVersions = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      let data: ThesisData | null = null;

      if (!forceRefresh) {
        // 先尝试从缓存加载
        data = await cache.getCachedVersions();
      }

      if (!data || forceRefresh) {
        // 从 WebDAV 加载
        data = await webdav.getVersions();
        await cache.cacheVersions(data);
      }

      setVersions(data.versions);
    } catch (err) {
      setError(err.message);
      // 如果网络失败，尝试使用缓存
      const cachedData = await cache.getCachedVersions();
      if (cachedData) {
        setVersions(cachedData.versions);
      }
    } finally {
      setLoading(false);
    }
  }, [webdav, cache]);

  // 切换排序
  const toggleSort = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // 排序后的版本列表
  const sortedVersions = [...versions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return {
    versions: sortedVersions,
    loading,
    error,
    sortOrder,
    refresh: () => loadVersions(true),
    toggleSort,
  };
}
```

**mobile/src/hooks/useFileCache.ts：**
```typescript
import { useState, useEffect } from 'react';
import { CacheService } from '../services/cache';

export function useFileCache(fileName: string, cache: CacheService) {
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCache = async () => {
      setLoading(true);
      const cached = await cache.isFileCached(fileName);
      setIsCached(cached);
      setLoading(false);
    };

    checkCache();
  }, [fileName, cache]);

  return { isCached, loading };
}
```


## 开发计划与注意事项

### 开发阶段划分

**阶段 1：基础架构搭建（1-2 天）**
- 创建 Monorepo 结构
  - 根目录创建 `package.json`（配置 npm workspaces）
  - 创建 `shared/` 目录和 package.json
  - 配置 TypeScript 和 tsconfig.json
- 初始化 React Native 项目
  - 使用 `npx react-native init mobile --template react-native-template-typescript`
  - 配置 Metro bundler 支持 workspaces
  - 安装核心依赖
- 抽取共享代码
  - 从桌面端抽取类型定义到 `shared/src/types/`
  - 创建工具函数到 `shared/src/utils/`
  - 配置桌面端引用 shared 包（可选）

**阶段 2：核心功能开发 - Android 优先（5-7 天）**
- WebDAV 配置页（1 天）
  - LoginScreen UI 实现
  - WebDAV 连接测试
  - 配置存储（AsyncStorage + Keychain）
- 版本列表页（2 天）
  - TimelineScreen UI 实现
  - WebDAV 数据读取
  - 缓存机制实现
  - 下拉刷新和排序功能
- 版本详情页（1 天）
  - DetailScreen UI 实现
  - 显示完整版本信息
  - 文件操作按钮
- 文件下载功能（1-2 天）
  - 文件下载服务实现
  - 进度显示
  - 缓存管理

**阶段 3：文件预览（2-3 天）**
- PDF 预览（1-2 天）
  - PDFViewerScreen 实现
  - react-native-pdf 集成
  - 缩放、翻页功能
- 其他格式支持（1 天）
  - react-native-file-viewer 集成
  - 系统应用调用
  - 错误处理

**阶段 4：设置与优化（2-3 天）**
- 设置页面（1 天）
  - SettingsScreen 实现
  - 缓存管理界面
  - 退出登录功能
- 错误处理与优化（1-2 天）
  - 网络异常处理
  - 加载状态优化
  - 性能优化（列表虚拟滚动）
  - Android 真机测试

**阶段 5：iOS 适配（3-4 天）**
- iOS 原生配置
  - Podfile 配置
  - Info.plist 权限配置
- 平台差异处理
  - 样式适配
  - 导航栏适配
  - 文件系统路径差异
- iOS 真机测试

**总计：约 13-19 天**

### 关键技术点

**1. 桌面端改造建议：**
- 确保 `data/` 目录在坚果云同步文件夹内
- 建议路径：`坚果云/论文管理/data/`
- 桌面端可以添加"数据目录"配置选项，让用户选择坚果云同步文件夹
- 或者在设置中添加"同步到坚果云"的说明文档

**2. WebDAV 配置要点：**
- 坚果云 WebDAV 地址：`https://dav.jianguoyun.com/dav/`
- 完整路径示例：`/dav/论文管理/data/versions.json`
- 应用密码获取：坚果云网页端 → 账户信息 → 安全选项 → 添加应用密码
- 注意：坚果云 WebDAV 有访问频率限制（每小时 600 次请求）

**3. React Native Metro 配置：**
需要配置 Metro 支持 npm workspaces，在 `mobile/metro.config.js` 中：
```javascript
const path = require('path');

module.exports = {
  projectRoot: __dirname,
  watchFolders: [
    path.resolve(__dirname, '../shared'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../node_modules'),
    ],
  },
};
```

**4. 文件类型支持：**
- PDF：react-native-pdf（内置预览）
- DOC/DOCX：react-native-file-viewer（调用系统应用）
- TXT：可以用 WebView 或 Text 组件显示
- 其他格式：提示用户使用系统应用打开

**5. 错误处理策略：**
- **网络异常**：显示缓存数据 + 提示"离线模式"
- **认证失败**：清除配置，引导用户重新登录
- **文件损坏**：提示重新下载
- **坚果云限流**：添加重试机制（指数退避）
- **超时处理**：30 秒超时，提示用户检查网络

**6. 性能优化：**
- 版本列表使用 `FlatList` 虚拟滚动
- 图片和文件懒加载
- 大文件下载支持断点续传（可选）
- PDF 预览按需加载页面
- 避免频繁的 WebDAV 请求（使用缓存）

### 注意事项

**安全性：**
- WebDAV 密码使用 `react-native-keychain` 加密存储
- 不在日志中输出敏感信息（密码、token）
- HTTPS 连接验证证书
- 防止 XSS 和注入攻击（虽然是移动端，但仍需注意）

**兼容性：**
- Android 最低支持版本：6.0（API 23）
- iOS 最低支持版本：13.0
- 处理不同屏幕尺寸（手机、平板）
- 支持深色模式（可选）

**用户体验：**
- 加载状态明确（骨架屏、加载指示器）
- 错误提示友好（具体说明问题和解决方案）
- 操作反馈及时（按钮点击效果、Toast 提示）
- 支持手势操作（下拉刷新、滑动返回）

**测试要点：**
- 网络异常场景（断网、超时、限流）
- 大文件下载（进度显示、取消下载）
- 缓存机制（离线访问、缓存更新）
- 不同文件格式（PDF、DOC、DOCX、TXT）
- 不同屏幕尺寸和分辨率

### Monorepo 配置

**根目录 package.json：**
```json
{
  "name": "thesis-tracker-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "Thesis-Progress-Tracker",
    "mobile",
    "shared"
  ],
  "scripts": {
    "dev:desktop": "cd Thesis-Progress-Tracker && npm run dev",
    "dev:mobile": "cd mobile && npm run android",
    "build:desktop": "cd Thesis-Progress-Tracker && npm run build",
    "build:mobile": "cd mobile && npm run build",
    "test": "npm run test --workspaces"
  }
}
```

**shared/package.json：**
```json
{
  "name": "@thesis-tracker/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

**mobile/package.json 添加依赖：**
```json
{
  "dependencies": {
    "@thesis-tracker/shared": "*",
    "react-native": "0.74.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.0",
    "react-native-fs": "^2.20.0",
    "react-native-pdf": "^6.7.0",
    "react-native-file-viewer": "^2.1.5",
    "axios": "^1.6.0"
  }
}
```

### 后续扩展可能性

**功能扩展：**
- 搜索功能（按版本号、内容搜索）
- 筛选功能（按日期范围、文件类型）
- 版本对比（显示两个版本的差异）
- 笔记功能（为版本添加移动端专属笔记）
- 通知功能（桌面端更新时推送通知）

**技术优化：**
- 增量同步（只同步变更的版本）
- 图片缩略图（为 PDF 生成缩略图）
- 全文搜索（索引论文内容）
- 离线编辑（移动端添加笔记，同步到桌面端）

## 总结

本设计采用 Monorepo 架构，通过 npm workspaces 实现代码共享，移动端作为桌面端的只读查看工具，通过坚果云 WebDAV API 实现数据同步。

**核心优势：**
1. **零风险**：桌面端代码完全不动
2. **真正复用**：通过 shared 包共享类型和工具
3. **渐进式开发**：可以分阶段实施，先验证 Android
4. **易于维护**：统一的代码库，便于管理和更新

**关键决策：**
- 技术栈：React Native（代码复用、开发效率）
- 项目结构：平行 Monorepo（零风险、清晰明确）
- 数据同步：WebDAV（无需后端、利用现有坚果云）
- 缓存策略：部分缓存（平衡体验和资源）
- 平台优先级：Android 优先（快速验证）

**实施建议：**
1. 先搭建基础架构，确保 Monorepo 配置正确
2. 优先实现核心功能（登录、列表、详情、下载）
3. 在 Android 上充分测试后再适配 iOS
4. 预留扩展空间，但不过度设计
