# 阶段 2：React Native 移动端初始化 + 基础功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初始化 React Native 移动端项目，实现 WebDAV 配置和版本列表基础功能

**Architecture:** 采用分层架构（UI → Hook → Service），使用 React Navigation 管理页面导航，AsyncStorage + Keychain 混合存储配置，引用 shared 包的类型和工具函数

**Tech Stack:** React Native 0.74+, TypeScript 5.3+, React Navigation 6.x, AsyncStorage, Keychain, Axios

---

## 前置条件

- [ ] Node.js 18+ 已安装
- [ ] Android Studio 已安装并配置
- [ ] Android SDK 已安装
- [ ] 阶段 1 的 Monorepo 基础架构已完成
- [ ] shared 包已实现（类型定义和工具函数）

---

## 文件结构概览

**将创建的文件：**

```
mobile/
├── package.json                      # 项目配置
├── tsconfig.json                     # TypeScript 配置
├── metro.config.js                   # Metro 配置（支持 monorepo）
├── app.json                          # React Native 配置
├── android/                          # Android 原生代码（自动生成）
├── src/
│   ├── App.tsx                       # 应用入口
│   ├── types/
│   │   └── index.ts                  # 类型导出
│   ├── utils/
│   │   └── errors.ts                 # 错误处理工具
│   ├── components/
│   │   ├── ErrorBoundary.tsx         # 错误边界
│   │   ├── LoadingSpinner.tsx        # 加载指示器
│   │   └── VersionCard.tsx           # 版本卡片
│   ├── services/
│   │   ├── storage.ts                # 存储服务
│   │   ├── webdav.ts                 # WebDAV 客户端
│   │   └── cache.ts                  # 缓存服务
│   ├── hooks/
│   │   └── useVersions.ts            # 版本列表 Hook
│   ├── navigation/
│   │   └── AppNavigator.tsx          # 导航配置
│   └── screens/
│       ├── LoginScreen.tsx           # 登录/配置页面
│       └── TimelineScreen.tsx        # 版本列表页面
└── __tests__/                        # 测试文件
    └── services/
        ├── storage.test.ts
        ├── webdav.test.ts
        └── cache.test.ts
```

---

## Task 1: 初始化 React Native 项目

**Files:**
- Create: `mobile/` 目录及所有基础文件

- [ ] **Step 1: 创建 React Native 项目**

Run:
```bash
cd "G:\我的云端硬盘\AI产品\论文管理\Thesis-Progress-Tracker"
npx react-native@latest init ThesisTrackerMobile --version 0.74.0
```

Expected: 创建 `ThesisTrackerMobile` 目录，包含完整的 React Native 项目结构

- [ ] **Step 2: 重命名项目目录**

Run:
```bash
cd "G:\我的云端硬盘\AI产品\论文管理\Thesis-Progress-Tracker"
move ThesisTrackerMobile mobile
```

Expected: 目录重命名为 `mobile`

- [ ] **Step 3: 更新 package.json 名称**

Modify: `mobile/package.json:2`

```json
{
  "name": "@thesis-tracker/mobile",
  "version": "1.0.0",
  "private": true,
  ...
}
```

- [ ] **Step 4: 验证项目可以运行**

Run:
```bash
cd mobile
npm start
```

Expected: Metro bundler 启动成功

- [ ] **Step 5: 提交初始化**

```bash
git add mobile/
git commit -m "chore: initialize React Native project

- Create mobile app with React Native 0.74
- Rename to mobile directory
- Update package name to @thesis-tracker/mobile

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 配置 TypeScript 和 Metro

**Files:**
- Modify: `mobile/tsconfig.json`
- Modify: `mobile/metro.config.js`

- [ ] **Step 1: 更新 TypeScript 配置**

Modify: `mobile/tsconfig.json`

```json
{
  "extends": "@react-native/typescript-config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@thesis-tracker/shared": ["../shared/src"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "android", "ios", "__tests__"]
}
```

- [ ] **Step 2: 配置 Metro 支持 monorepo**

Modify: `mobile/metro.config.js`

```javascript
const path = require('path')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
}

module.exports = mergeConfig(getDefaultConfig(projectRoot), config)
```

- [ ] **Step 3: 验证 TypeScript 配置**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误（可能有一些警告）

- [ ] **Step 4: 提交配置**

```bash
git add mobile/tsconfig.json mobile/metro.config.js
git commit -m "chore: configure TypeScript and Metro for monorepo

- Add path mapping for shared package
- Configure Metro to watch workspace root
- Enable strict TypeScript checking

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 安装依赖

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: 安装 React Navigation 依赖**

Run:
```bash
cd mobile
npm install @react-navigation/native@^6.1.0 @react-navigation/stack@^6.3.0
npm install react-native-screens@^3.29.0 react-native-safe-area-context@^4.8.0 react-native-gesture-handler@^2.14.0
```

- [ ] **Step 2: 安装存储依赖**

Run:
```bash
npm install @react-native-async-storage/async-storage@^1.21.0 react-native-keychain@^8.1.0
```

- [ ] **Step 3: 安装网络依赖**

Run:
```bash
npm install axios@^1.6.0
```

- [ ] **Step 4: 链接原生模块（Android）**

Run:
```bash
cd android
./gradlew clean
cd ..
```

Expected: Android 原生模块清理完成

- [ ] **Step 5: 验证依赖安装**

Run:
```bash
npm list --depth=0
```

Expected: 所有依赖都已安装，无错误

- [ ] **Step 6: 验证 shared 包引用**

Run:
```bash
cd ..
npm install
cd mobile
```

Expected: 根 workspace 依赖安装完成，mobile 可以访问 shared 包

- [ ] **Step 7: 提交依赖**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore: install React Native dependencies

- Add React Navigation and required peer dependencies
- Add AsyncStorage and Keychain for storage
- Add Axios for HTTP requests

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 创建类型定义和错误处理

**Files:**
- Create: `mobile/src/types/index.ts`
- Create: `mobile/src/utils/errors.ts`

- [ ] **Step 1: 创建类型导出文件**

Create: `mobile/src/types/index.ts`

```typescript
// 导出 shared 包的类型
export type {
  Version,
  ThesisData,
  WebDAVConfig,
  AppConfig,
} from '@thesis-tracker/shared'

// 导出 shared 包的工具函数
export {
  formatDate,
  formatDateTime,
  getRelativeTime,
  formatFileSize,
  getFileExtension,
  getFileIcon,
  isValidWebDAVUrl,
  isValidEmail,
  isValidDataPath,
} from '@thesis-tracker/shared'
```

- [ ] **Step 2: 创建错误类型定义**

Create: `mobile/src/utils/errors.ts`

```typescript
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export function handleError(error: Error): string {
  if (error instanceof NetworkError) {
    return '网络连接失败，请检查网络设置'
  } else if (error instanceof AuthError) {
    return '用户名或密码错误'
  } else if (error instanceof NotFoundError) {
    return '数据文件不存在，请检查路径'
  } else {
    return '发生未知错误，请稍后重试'
  }
}
```

- [ ] **Step 3: 验证类型导入**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: 提交类型定义**

```bash
git add mobile/src/types/ mobile/src/utils/
git commit -m "feat(mobile): add type definitions and error handling

- Export shared package types and utilities
- Define custom error classes
- Add error handling utility function

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 实现存储服务（TDD）

**Files:**
- Create: `mobile/__tests__/services/storage.test.ts`
- Create: `mobile/src/services/storage.ts`

- [ ] **Step 1: 编写存储服务测试**

Create: `mobile/__tests__/services/storage.test.ts`

```typescript
import { StorageService } from '../../src/services/storage'
import { WebDAVConfig } from '../../src/types'

describe('StorageService', () => {
  let storage: StorageService

  beforeEach(() => {
    storage = new StorageService()
  })

  afterEach(async () => {
    await storage.clearConfig()
  })

  it('should save and retrieve config', async () => {
    const config: WebDAVConfig = {
      serverUrl: 'https://dav.jianguoyun.com/dav/',
      username: 'test@example.com',
      password: 'test-password',
      dataPath: '/论文管理/data/',
    }

    await storage.saveConfig(config)
    const retrieved = await storage.getConfig()

    expect(retrieved).toEqual(config)
  })

  it('should return null when no config exists', async () => {
    const config = await storage.getConfig()
    expect(config).toBeNull()
  })

  it('should clear config', async () => {
    const config: WebDAVConfig = {
      serverUrl: 'https://dav.jianguoyun.com/dav/',
      username: 'test@example.com',
      password: 'test-password',
      dataPath: '/论文管理/data/',
    }

    await storage.saveConfig(config)
    await storage.clearConfig()
    const retrieved = await storage.getConfig()

    expect(retrieved).toBeNull()
  })
})
```

- [ ] **Step 2: 运行测试（预期失败）**

Run:
```bash
cd mobile
npm test -- __tests__/services/storage.test.ts
```

Expected: FAIL - StorageService not found

- [ ] **Step 3: 实现存储服务**

Create: `mobile/src/services/storage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Keychain from 'react-native-keychain'
import { WebDAVConfig } from '../types'

const CONFIG_KEY = '@thesis_tracker:config'
const KEYCHAIN_SERVICE = 'com.thesistracker.webdav'

export class StorageService {
  async saveConfig(config: WebDAVConfig): Promise<void> {
    try {
      // 保存非敏感数据到 AsyncStorage
      const publicData = {
        serverUrl: config.serverUrl,
        username: config.username,
        dataPath: config.dataPath,
      }
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(publicData))

      // 保存密码到 Keychain
      await Keychain.setGenericPassword(
        config.username,
        config.password,
        { service: KEYCHAIN_SERVICE }
      )
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`)
    }
  }

  async getConfig(): Promise<WebDAVConfig | null> {
    try {
      // 读取非敏感数据
      const publicDataStr = await AsyncStorage.getItem(CONFIG_KEY)
      if (!publicDataStr) {
        return null
      }

      const publicData = JSON.parse(publicDataStr)

      // 读取密码
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      })

      if (!credentials) {
        return null
      }

      return {
        serverUrl: publicData.serverUrl,
        username: publicData.username,
        dataPath: publicData.dataPath,
        password: credentials.password,
      }
    } catch (error) {
      console.error('Failed to get config:', error)
      return null
    }
  }

  async clearConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONFIG_KEY)
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE })
    } catch (error) {
      throw new Error(`Failed to clear config: ${error}`)
    }
  }
}
```

- [ ] **Step 4: 运行测试（预期通过）**

Run:
```bash
npm test -- __tests__/services/storage.test.ts
```

Expected: PASS - All tests passing

- [ ] **Step 5: 提交存储服务**

```bash
git add mobile/__tests__/services/storage.test.ts mobile/src/services/storage.ts
git commit -m "feat(mobile): implement storage service with tests

- Add StorageService with AsyncStorage + Keychain
- Store non-sensitive data in AsyncStorage
- Store password securely in Keychain
- Add comprehensive unit tests

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 实现 WebDAV 服务（TDD）

**Files:**
- Create: `mobile/__tests__/services/webdav.test.ts`
- Create: `mobile/src/services/webdav.ts`

- [ ] **Step 1: 编写 WebDAV 服务测试**

Create: `mobile/__tests__/services/webdav.test.ts`

```typescript
import { WebDAVService } from '../../src/services/webdav'
import { WebDAVConfig } from '../../src/types'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('WebDAVService', () => {
  let webdav: WebDAVService
  const config: WebDAVConfig = {
    serverUrl: 'https://dav.jianguoyun.com/dav/',
    username: 'test@example.com',
    password: 'test-password',
    dataPath: '/论文管理/data/',
  }

  beforeEach(() => {
    webdav = new WebDAVService()
    webdav.initialize(config)
    jest.clearAllMocks()
  })

  it('should test connection successfully', async () => {
    mockedAxios.request.mockResolvedValueOnce({ status: 200 })

    const result = await webdav.testConnection()

    expect(result).toBe(true)
    expect(mockedAxios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PROPFIND',
        url: 'https://dav.jianguoyun.com/dav/论文管理/data/',
      })
    )
  })

  it('should get versions successfully', async () => {
    const mockData = {
      schemaVersion: '1.0',
      dataVersion: 1,
      versions: [],
      lastModified: '2026-05-04T10:00:00Z',
    }

    mockedAxios.get.mockResolvedValueOnce({ data: mockData })

    const result = await webdav.getVersions()

    expect(result).toEqual(mockData)
  })

  it('should throw AuthError on 401', async () => {
    mockedAxios.request.mockRejectedValueOnce({
      response: { status: 401 },
    })

    await expect(webdav.testConnection()).rejects.toThrow('AuthError')
  })
})
```

- [ ] **Step 2: 运行测试（预期失败）**

Run:
```bash
npm test -- __tests__/services/webdav.test.ts
```

Expected: FAIL - WebDAVService not found

- [ ] **Step 3: 实现 WebDAV 服务**

Create: `mobile/src/services/webdav.ts`

```typescript
import axios, { AxiosInstance } from 'axios'
import { WebDAVConfig, ThesisData } from '../types'
import { NetworkError, AuthError, NotFoundError } from '../utils/errors'

export class WebDAVService {
  private config: WebDAVConfig | null = null
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      timeout: 30000,
    })
  }

  initialize(config: WebDAVConfig): void {
    this.config = config
    this.client.defaults.auth = {
      username: config.username,
      password: config.password,
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('WebDAV service not initialized')
    }

    try {
      const url = `${this.config.serverUrl}${this.config.dataPath.substring(1)}`
      await this.client.request({
        method: 'PROPFIND',
        url,
        headers: {
          Depth: '0',
        },
      })
      return true
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AuthError('认证失败')
      } else if (error.response?.status === 404) {
        throw new NotFoundError('路径不存在')
      } else if (error.code === 'ECONNABORTED' || !error.response) {
        throw new NetworkError('网络连接失败')
      }
      throw error
    }
  }

  async getVersions(): Promise<ThesisData> {
    if (!this.config) {
      throw new Error('WebDAV service not initialized')
    }

    try {
      const url = `${this.config.serverUrl}${this.config.dataPath.substring(1)}versions.json`
      const response = await this.client.get<ThesisData>(url)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AuthError('认证失败')
      } else if (error.response?.status === 404) {
        throw new NotFoundError('versions.json 不存在')
      } else if (error.code === 'ECONNABORTED' || !error.response) {
        throw new NetworkError('网络连接失败')
      }
      throw error
    }
  }

  async downloadFile(filePath: string): Promise<string> {
    // 后续阶段实现
    throw new Error('Not implemented')
  }
}
```

- [ ] **Step 4: 运行测试（预期通过）**

Run:
```bash
npm test -- __tests__/services/webdav.test.ts
```

Expected: PASS - All tests passing

- [ ] **Step 5: 提交 WebDAV 服务**

```bash
git add mobile/__tests__/services/webdav.test.ts mobile/src/services/webdav.ts
git commit -m "feat(mobile): implement WebDAV service with tests

- Add WebDAVService with axios client
- Implement testConnection and getVersions
- Handle authentication and network errors
- Add comprehensive unit tests with mocks

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 实现缓存服务（TDD）

**Files:**
- Create: `mobile/__tests__/services/cache.test.ts`
- Create: `mobile/src/services/cache.ts`

- [ ] **Step 1: 编写缓存服务测试**

Create: `mobile/__tests__/services/cache.test.ts`

```typescript
import { CacheService } from '../../src/services/cache'
import { ThesisData } from '../../src/types'

describe('CacheService', () => {
  let cache: CacheService

  beforeEach(() => {
    cache = new CacheService()
  })

  afterEach(async () => {
    await cache.clearCache()
  })

  it('should cache and retrieve versions', async () => {
    const data: ThesisData = {
      schemaVersion: '1.0',
      dataVersion: 1,
      versions: [],
      lastModified: '2026-05-04T10:00:00Z',
    }

    await cache.cacheVersions(data)
    const retrieved = await cache.getCachedVersions()

    expect(retrieved).toEqual(data)
  })

  it('should return null when no cache exists', async () => {
    const data = await cache.getCachedVersions()
    expect(data).toBeNull()
  })

  it('should detect when update is needed', async () => {
    const data: ThesisData = {
      schemaVersion: '1.0',
      dataVersion: 1,
      versions: [],
      lastModified: '2026-05-04T10:00:00Z',
    }

    await cache.cacheVersions(data)

    const needsUpdate = await cache.needsUpdate(2)
    expect(needsUpdate).toBe(true)

    const noUpdate = await cache.needsUpdate(1)
    expect(noUpdate).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试（预期失败）**

Run:
```bash
npm test -- __tests__/services/cache.test.ts
```

Expected: FAIL - CacheService not found

- [ ] **Step 3: 实现缓存服务**

Create: `mobile/src/services/cache.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThesisData } from '../types'

const CACHE_KEY = '@thesis_tracker:versions_cache'

export class CacheService {
  async cacheVersions(data: ThesisData): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to cache versions:', error)
      throw new Error(`Failed to cache versions: ${error}`)
    }
  }

  async getCachedVersions(): Promise<ThesisData | null> {
    try {
      const dataStr = await AsyncStorage.getItem(CACHE_KEY)
      if (!dataStr) {
        return null
      }
      return JSON.parse(dataStr)
    } catch (error) {
      console.error('Failed to get cached versions:', error)
      return null
    }
  }

  async getCachedDataVersion(): Promise<number | null> {
    const data = await this.getCachedVersions()
    return data?.dataVersion ?? null
  }

  async needsUpdate(remoteDataVersion: number): Promise<boolean> {
    const cachedVersion = await this.getCachedDataVersion()
    if (cachedVersion === null) {
      return true
    }
    return remoteDataVersion > cachedVersion
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw new Error(`Failed to clear cache: ${error}`)
    }
  }
}
```

- [ ] **Step 4: 运行测试（预期通过）**

Run:
```bash
npm test -- __tests__/services/cache.test.ts
```

Expected: PASS - All tests passing

- [ ] **Step 5: 提交缓存服务**

```bash
git add mobile/__tests__/services/cache.test.ts mobile/src/services/cache.ts
git commit -m "feat(mobile): implement cache service with tests

- Add CacheService with AsyncStorage
- Implement version caching and retrieval
- Add version comparison logic
- Add comprehensive unit tests

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 实现基础组件

**Files:**
- Create: `mobile/src/components/ErrorBoundary.tsx`
- Create: `mobile/src/components/LoadingSpinner.tsx`
- Create: `mobile/src/components/VersionCard.tsx`

- [ ] **Step 1: 创建错误边界组件**

Create: `mobile/src/components/ErrorBoundary.tsx`

```typescript
import React from 'react'
import { View, Text, Button, StyleSheet } from 'react-native'
import { handleError } from '../utils/errors'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>出错了</Text>
          <Text style={styles.message}>
            {handleError(this.state.error)}
          </Text>
          <Button title="重新加载" onPress={this.handleReset} />
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F7FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
})
```

- [ ] **Step 2: 创建加载指示器组件**

Create: `mobile/src/components/LoadingSpinner.tsx`

```typescript
import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

export const LoadingSpinner: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2D5A4A" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
})
```

- [ ] **Step 3: 创建版本卡片组件**

Create: `mobile/src/components/VersionCard.tsx`

```typescript
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Version, formatDate, formatFileSize, getFileIcon } from '../types'

interface Props {
  version: Version
  onPress: () => void
}

export const VersionCard: React.FC<Props> = ({ version, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.versionNumber}>{version.version}</Text>
        <Text style={styles.date}>{formatDate(version.date)}</Text>
      </View>

      <Text style={styles.changes}>{version.changes}</Text>
      <Text style={styles.focus}>{version.focus}</Text>

      <View style={styles.fileInfo}>
        <Text style={styles.fileIcon}>{getFileIcon(version.fileName)}</Text>
        <Text style={styles.fileName}>{version.fileName}</Text>
        {version.fileSize && (
          <Text style={styles.fileSize}>{formatFileSize(version.fileSize)}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  changes: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  focus: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileIcon: {
    fontSize: 16,
  },
  fileName: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
  fileSize: {
    fontSize: 13,
    color: '#999999',
  },
})
```

- [ ] **Step 4: 验证组件编译**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 5: 提交基础组件**

```bash
git add mobile/src/components/
git commit -m "feat(mobile): add base UI components

- Add ErrorBoundary for error handling
- Add LoadingSpinner for loading states
- Add VersionCard for displaying version info
- Use shared package utilities for formatting

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 实现 useVersions Hook

**Files:**
- Create: `mobile/src/hooks/useVersions.ts`

- [ ] **Step 1: 创建 useVersions Hook**

Create: `mobile/src/hooks/useVersions.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { Version, ThesisData } from '../types'
import { WebDAVService } from '../services/webdav'
import { CacheService } from '../services/cache'
import { handleError } from '../utils/errors'

interface UseVersionsResult {
  versions: Version[]
  loading: boolean
  refreshing: boolean
  error: string | null
  sortOrder: 'asc' | 'desc'
  loadVersions: (forceRefresh?: boolean) => Promise<void>
  toggleSort: () => void
  sortedVersions: Version[]
}

export function useVersions(
  webdav: WebDAVService,
  cache: CacheService
): UseVersionsResult {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const loadVersions = useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) {
          setRefreshing(true)
        } else {
          setLoading(true)
        }
        setError(null)

        // 如果不是强制刷新，先从缓存加载
        if (!forceRefresh) {
          const cachedData = await cache.getCachedVersions()
          if (cachedData) {
            setVersions(cachedData.versions)
            setLoading(false)
            // 继续后台更新
          }
        }

        // 从 WebDAV 加载最新数据
        const data = await webdav.getVersions()

        // 检查是否需要更新
        if (forceRefresh || (await cache.needsUpdate(data.dataVersion))) {
          await cache.cacheVersions(data)
          setVersions(data.versions)
        }
      } catch (err) {
        const errorMessage = handleError(err as Error)
        setError(errorMessage)

        // 如果是首次加载失败，尝试使用缓存
        if (!forceRefresh && versions.length === 0) {
          const cachedData = await cache.getCachedVersions()
          if (cachedData) {
            setVersions(cachedData.versions)
          }
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [webdav, cache, versions.length]
  )

  const toggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
  }, [])

  const sortedVersions = [...versions].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
  })

  useEffect(() => {
    loadVersions()
  }, [])

  return {
    versions,
    loading,
    refreshing,
    error,
    sortOrder,
    loadVersions,
    toggleSort,
    sortedVersions,
  }
}
```

- [ ] **Step 2: 验证 Hook 编译**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交 Hook**

```bash
git add mobile/src/hooks/
git commit -m "feat(mobile): add useVersions custom hook

- Implement version list data management
- Support cache-first loading strategy
- Add pull-to-refresh functionality
- Add sorting toggle (asc/desc)
- Handle errors with fallback to cache

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 实现 LoginScreen

**Files:**
- Create: `mobile/src/screens/LoginScreen.tsx`

- [ ] **Step 1: 创建 LoginScreen**

Create: `mobile/src/screens/LoginScreen.tsx`

```typescript
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { WebDAVConfig } from '../types'
import { StorageService } from '../services/storage'
import { WebDAVService } from '../services/webdav'

interface Props {
  onLoginSuccess: () => void
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [config, setConfig] = useState<WebDAVConfig>({
    serverUrl: 'https://dav.jianguoyun.com/dav/',
    username: '',
    password: '',
    dataPath: '/论文管理/data/',
  })
  const [loading, setLoading] = useState(false)

  const storage = new StorageService()
  const webdav = new WebDAVService()

  const handleTestConnection = async () => {
    if (!config.username || !config.password) {
      Alert.alert('错误', '请填写用户名和密码')
      return
    }

    setLoading(true)
    try {
      webdav.initialize(config)
      await webdav.testConnection()
      Alert.alert('成功', '连接测试成功')
    } catch (error: any) {
      Alert.alert('错误', error.message || '连接失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndLogin = async () => {
    if (!config.username || !config.password) {
      Alert.alert('错误', '请填写用户名和密码')
      return
    }

    setLoading(true)
    try {
      webdav.initialize(config)
      await webdav.testConnection()
      await storage.saveConfig(config)
      onLoginSuccess()
    } catch (error: any) {
      Alert.alert('错误', error.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>论文进度管理器</Text>
        <Text style={styles.subtitle}>配置 WebDAV 连接</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>服务器地址</Text>
        <TextInput
          style={styles.input}
          value={config.serverUrl}
          onChangeText={(text) => setConfig({ ...config, serverUrl: text })}
          placeholder="https://dav.jianguoyun.com/dav/"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>用户名（邮箱）</Text>
        <TextInput
          style={styles.input}
          value={config.username}
          onChangeText={(text) => setConfig({ ...config, username: text })}
          placeholder="your.email@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={styles.label}>应用密码</Text>
        <TextInput
          style={styles.input}
          value={config.password}
          onChangeText={(text) => setConfig({ ...config, password: text })}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>数据目录路径</Text>
        <TextInput
          style={styles.input}
          value={config.dataPath}
          onChangeText={(text) => setConfig({ ...config, dataPath: text })}
          placeholder="/论文管理/data/"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestConnection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#2D5A4A" />
          ) : (
            <Text style={styles.testButtonText}>测试连接</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleSaveAndLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>保存并登录</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#2D5A4A',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4FD',
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE3EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5A4A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5A4A',
  },
  loginButton: {
    backgroundColor: '#2D5A4A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
```

- [ ] **Step 2: 验证编译**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交 LoginScreen**

```bash
git add mobile/src/screens/LoginScreen.tsx
git commit -m "feat(mobile): implement LoginScreen

- Add WebDAV configuration form
- Implement connection testing
- Save config to storage on success
- Match desktop app color scheme

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 实现 TimelineScreen

**Files:**
- Create: `mobile/src/screens/TimelineScreen.tsx`

- [ ] **Step 1: 创建 TimelineScreen**

Create: `mobile/src/screens/TimelineScreen.tsx`

```typescript
import React, { useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { VersionCard } from '../components/VersionCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useVersions } from '../hooks/useVersions'
import { WebDAVService } from '../services/webdav'
import { CacheService } from '../services/cache'
import { StorageService } from '../services/storage'

interface Props {
  onSettings: () => void
}

export const TimelineScreen: React.FC<Props> = ({ onSettings }) => {
  const storage = new StorageService()
  const webdav = new WebDAVService()
  const cache = new CacheService()

  useEffect(() => {
    // 初始化 WebDAV 服务
    const initWebDAV = async () => {
      const config = await storage.getConfig()
      if (config) {
        webdav.initialize(config)
      }
    }
    initWebDAV()
  }, [])

  const {
    sortedVersions,
    loading,
    refreshing,
    error,
    sortOrder,
    loadVersions,
    toggleSort,
  } = useVersions(webdav, cache)

  const handleVersionPress = (versionId: string) => {
    // 后续阶段实现
    Alert.alert('提示', '版本详情功能将在后续版本中实现')
  }

  if (loading && !refreshing) {
    return <LoadingSpinner />
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>论文版本历史</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleSort}>
            <Text style={styles.iconText}>↕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onSettings}>
            <Text style={styles.iconText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={sortedVersions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VersionCard
            version={item}
            onPress={() => handleVersionPress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVersions(true)}
            colors={['#2D5A4A']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无版本记录</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  navbar: {
    backgroundColor: '#2D5A4A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: '#2D5A4A',
  },
  errorBanner: {
    backgroundColor: '#FEE',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCC',
  },
  errorText: {
    color: '#B83B3B',
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
})
```

- [ ] **Step 2: 验证编译**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交 TimelineScreen**

```bash
git add mobile/src/screens/TimelineScreen.tsx
git commit -m "feat(mobile): implement TimelineScreen

- Add version list display with FlatList
- Implement pull-to-refresh
- Add sort toggle button
- Show error banner when needed
- Match desktop app color scheme

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: 实现导航和应用入口

**Files:**
- Create: `mobile/src/navigation/AppNavigator.tsx`
- Modify: `mobile/src/App.tsx`

- [ ] **Step 1: 创建导航配置**

Create: `mobile/src/navigation/AppNavigator.tsx`

```typescript
import React, { useState, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { LoginScreen } from '../screens/LoginScreen'
import { TimelineScreen } from '../screens/TimelineScreen'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StorageService } from '../services/storage'

const Stack = createStackNavigator()

export const AppNavigator: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const storage = new StorageService()

  useEffect(() => {
    async function checkLoginStatus() {
      try {
        const config = await storage.getConfig()
        setIsLoggedIn(config !== null)
      } catch (error) {
        console.error('Failed to check login status:', error)
        setIsLoggedIn(false)
      }
    }
    checkLoginStatus()
  }, [])

  // 加载中状态
  if (isLoggedIn === null) {
    return <LoadingSpinner />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Timeline">
            {() => <TimelineScreen onSettings={() => setIsLoggedIn(false)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

- [ ] **Step 2: 更新 App.tsx**

Modify: `mobile/App.tsx`

```typescript
import React from 'react'
import { ErrorBoundary } from './src/components/ErrorBoundary'
import { AppNavigator } from './src/navigation/AppNavigator'

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  )
}

export default App
```

- [ ] **Step 3: 验证编译**

Run:
```bash
cd mobile
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: 提交导航和应用入口**

```bash
git add mobile/src/navigation/ mobile/src/App.tsx
git commit -m "feat(mobile): implement navigation and app entry

- Add AppNavigator with login state management
- Integrate ErrorBoundary at app root
- Configure stack navigation between Login and Timeline
- Add loading state during initialization

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: 测试和验证

**Files:**
- None (testing only)

- [ ] **Step 1: 运行所有单元测试**

Run:
```bash
cd mobile
npm test
```

Expected: All tests passing

- [ ] **Step 2: 运行 TypeScript 类型检查**

Run:
```bash
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 启动 Metro bundler**

Run:
```bash
npm start
```

Expected: Metro bundler 启动成功，无错误

- [ ] **Step 4: 在 Android 设备/模拟器上运行**

Run (in a new terminal):
```bash
cd mobile
npm run android
```

Expected: 应用成功安装并启动

- [ ] **Step 5: 手动测试 LoginScreen**

测试步骤：
1. 应用启动后显示 LoginScreen
2. 输入 WebDAV 配置
3. 点击"测试连接"按钮
4. 验证连接成功提示
5. 点击"保存并登录"按钮
6. 验证跳转到 TimelineScreen

Expected: 所有步骤正常工作

- [ ] **Step 6: 手动测试 TimelineScreen**

测试步骤：
1. 进入 TimelineScreen
2. 验证版本列表显示
3. 下拉刷新列表
4. 点击排序按钮切换排序
5. 点击设置按钮返回 LoginScreen

Expected: 所有功能正常工作

- [ ] **Step 7: 测试离线模式**

测试步骤：
1. 在有网络时加载版本列表
2. 关闭网络连接
3. 重启应用
4. 验证缓存的版本列表仍然显示

Expected: 离线模式下可以查看缓存数据

- [ ] **Step 8: 测试错误处理**

测试步骤：
1. 输入错误的用户名/密码
2. 验证显示认证错误
3. 输入错误的服务器地址
4. 验证显示网络错误

Expected: 错误信息正确显示

- [ ] **Step 9: 最终提交**

```bash
git add -A
git commit -m "chore: complete phase 2 implementation

- All unit tests passing
- Manual testing completed
- LoginScreen and TimelineScreen working
- Offline mode verified
- Error handling tested

Phase 2 完成：
- ✅ React Native 项目初始化
- ✅ Metro 配置支持 monorepo
- ✅ 存储服务（AsyncStorage + Keychain）
- ✅ WebDAV 客户端
- ✅ 缓存服务
- ✅ LoginScreen 实现
- ✅ TimelineScreen 实现
- ✅ 导航配置
- ✅ 错误处理

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## 验收标准

完成所有任务后，应满足以下条件：

- [ ] React Native 项目已创建，Android 可以正常运行
- [ ] Metro 配置正确，可以引用 shared 包
- [ ] 所有服务层单元测试通过（StorageService, WebDAVService, CacheService）
- [ ] LoginScreen 可以输入配置并测试连接
- [ ] 配置可以保存到本地存储（密码加密）
- [ ] TimelineScreen 可以显示版本列表
- [ ] 版本列表支持下拉刷新
- [ ] 版本列表支持排序切换
- [ ] 离线模式下可以查看缓存的版本列表
- [ ] 错误处理完善，用户体验良好
- [ ] 代码通过 TypeScript 类型检查
- [ ] UI 与桌面端配色一致（深绿色主题 #2D5A4A）

---

## 已知限制

1. **Google Drive 文件系统问题**
   - 如果项目在 Google Drive 同步目录，npm install 可能会失败
   - 建议将 mobile 目录移到本地磁盘（如 C:\Projects\）

2. **Android 模拟器要求**
   - 需要 Android Studio 和 Android SDK
   - 建议使用 Android 11+ 的模拟器

3. **首次运行可能较慢**
   - Metro bundler 首次启动需要编译所有依赖
   - 后续启动会快很多

---

## 下一步

完成阶段 2 后，可以继续：

- **阶段 3**：实现版本详情页面
- **阶段 4**：实现文件下载和预览功能
- **阶段 5**：iOS 平台适配
- **阶段 6**：性能优化和用户体验改进

---

## 参考资料

- React Native 官方文档：https://reactnative.dev/
- React Navigation 文档：https://reactnavigation.org/
- AsyncStorage 文档：https://react-native-async-storage.github.io/async-storage/
- Keychain 文档：https://github.com/oblador/react-native-keychain
- 设计文档：`docs/superpowers/specs/2026-05-04-phase2-react-native-init-design.md`
- UI 设计文件：`移动端UI/pencil-new.pen`

---

**计划创建日期：** 2026-05-04
**预计工作量：** 5-7 天
**任务总数：** 13 个主要任务
**测试覆盖：** 服务层单元测试 + 手动集成测试
