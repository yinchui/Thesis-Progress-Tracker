# 阶段 2：React Native 移动端初始化 + 基础功能 设计文档

**日期：** 2026-05-04  
**版本：** 1.0  
**状态：** 设计中

---

## 概述

本文档描述阶段 2 的设计方案：初始化 React Native 移动端项目，并实现基础功能（登录配置和版本列表）。

### 目标

1. 使用 React Native CLI 创建移动端项目
2. 配置 Metro bundler 支持 monorepo
3. 实现 WebDAV 配置页面（LoginScreen）
4. 实现版本列表页面（TimelineScreen）
5. 集成存储服务（AsyncStorage + Keychain）
6. 集成 WebDAV 客户端
7. 实现缓存机制

### 范围

**包含：**
- Android 平台开发
- 登录/配置功能
- 版本列表展示
- 下拉刷新
- 排序切换
- 离线缓存

**不包含：**
- iOS 平台（后续阶段）
- 文件下载和预览（后续阶段）
- 版本详情页面（后续阶段）
- 文件上传（后续阶段）

---

## 技术栈

### 核心框架
- **React Native**: 0.74+
- **TypeScript**: 5.3+
- **Node.js**: 18+

### 导航
- **React Navigation**: 6.x
  - @react-navigation/native
  - @react-navigation/stack

### 存储
- **@react-native-async-storage/async-storage**: 配置存储
- **react-native-keychain**: 密码加密存储

### 网络
- **axios**: HTTP 客户端（WebDAV）

### 开发工具
- **Metro**: React Native 打包工具
- **Android Studio**: Android 开发环境

---

## 架构设计

### 目录结构

```
论文管理/
├── mobile/                           # React Native 移动端
│   ├── android/                      # Android 原生代码
│   ├── src/
│   │   ├── screens/                  # 页面
│   │   │   ├── LoginScreen.tsx       # WebDAV 配置页
│   │   │   └── TimelineScreen.tsx    # 版本列表页
│   │   ├── components/               # 组件
│   │   │   ├── VersionCard.tsx       # 版本卡片
│   │   │   └── LoadingSpinner.tsx    # 加载指示器
│   │   ├── services/                 # 服务层
│   │   │   ├── storage.ts            # 存储服务
│   │   │   ├── webdav.ts             # WebDAV 客户端
│   │   │   └── cache.ts              # 缓存管理
│   │   ├── navigation/               # 导航配置
│   │   │   └── AppNavigator.tsx
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   └── useVersions.ts
│   │   ├── types/                    # 类型定义（引用 shared）
│   │   │   └── index.ts
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── metro.config.js               # Metro 配置
│   └── app.json
├── shared/                           # 共享代码（已完成）
└── Thesis-Progress-Tracker/         # 桌面端（已完成）
```

### 架构原则

1. **分层架构**：UI 层 → Hook 层 → Service 层
2. **关注点分离**：业务逻辑与 UI 分离
3. **代码复用**：引用 shared 包的类型和工具函数
4. **类型安全**：全面使用 TypeScript
5. **离线优先**：缓存优先，后台同步

---

## 核心服务设计

### 1. 存储服务（storage.ts）

**职责：** 管理 WebDAV 配置的存储和读取

**存储策略：**
- **AsyncStorage**：服务器地址、用户名、数据路径
- **Keychain**：密码（加密存储）

**接口：**

```typescript
interface StorageService {
  // 保存配置
  saveConfig(config: WebDAVConfig): Promise<void>
  
  // 读取配置
  getConfig(): Promise<WebDAVConfig | null>
  
  // 清除配置（退出登录）
  clearConfig(): Promise<void>
}
```

**实现要点：**
- 使用 `@react-native-async-storage/async-storage` 存储非敏感数据
- 使用 `react-native-keychain` 存储密码
- 错误处理：存储失败时抛出异常

---

### 2. WebDAV 服务（webdav.ts）

**职责：** 与坚果云 WebDAV API 通信

**功能：**
- 测试连接是否有效
- 获取 versions.json
- 下载文件（后续阶段）

**接口：**

```typescript
interface WebDAVService {
  // 初始化服务（传入配置）
  initialize(config: WebDAVConfig): void
  
  // 测试连接
  testConnection(): Promise<boolean>
  
  // 获取版本列表
  getVersions(): Promise<ThesisData>
  
  // 下载文件（后续阶段）
  downloadFile(filePath: string): Promise<string>
}
```

**实现要点：**
- 使用 axios 发送 HTTP 请求
- 使用 Basic Auth 认证
- 通过 `initialize()` 方法设置配置，避免每次调用都传递配置参数
- 错误处理：
  - 网络错误 → 抛出 `NetworkError`
  - 认证失败 → 抛出 `AuthError`
  - 文件不存在 → 抛出 `NotFoundError`
- 使用 shared 包的类型：`ThesisData`, `Version`, `WebDAVConfig`

---

### 3. 缓存服务（cache.ts）

**职责：** 本地缓存管理

**缓存内容：**
- 版本列表（versions.json）
- 最后更新时间

**缓存策略：**
1. 首次加载从缓存读取（快速启动）
2. 后台从 WebDAV 拉取最新数据
3. 对比 `dataVersion`，如有更新则刷新
4. 下拉刷新强制从 WebDAV 重新加载

**接口：**

```typescript
interface CacheService {
  // 缓存版本列表
  cacheVersions(data: ThesisData): Promise<void>
  
  // 获取缓存的版本列表
  getCachedVersions(): Promise<ThesisData | null>
  
  // 获取缓存的数据版本号
  getCachedDataVersion(): Promise<number | null>
  
  // 检查是否需要更新（对比 dataVersion）
  needsUpdate(remoteDataVersion: number): Promise<boolean>
  
  // 清除缓存
  clearCache(): Promise<void>
}
```

**实现要点：**
- 使用 AsyncStorage 存储缓存数据
- 缓存键：`@thesis_tracker:versions_cache`
- 缓存过期时间：无（手动刷新）
- `needsUpdate()` 方法对比本地和远程的 `dataVersion`，判断是否需要更新

---

## 页面设计

### 1. LoginScreen（登录/配置页面）

**UI 设计：** 见 `移动端UI/pencil-new.pen` 中的 LoginScreen

**功能：**
- 输入 WebDAV 配置（服务器地址、用户名、密码、数据路径）
- 提供"坚果云"预设模板（自动填充服务器地址）
- 测试连接按钮
- 保存配置并跳转到列表页

**UI 元素：**
- 顶部标题区域（深绿色背景 `#2D5A4A`）
  - 标题："论文进度管理器"
  - 副标题："配置 WebDAV 连接"
- 4 个输入框
  - 服务器地址（默认：`https://dav.jianguoyun.com/dav/`）
  - 用户名（邮箱）
  - 应用密码
  - 数据目录路径（默认：`/论文管理/data/`）
- 2 个按钮
  - "测试连接"（白色背景，绿色边框和文字）
  - "保存并登录"（绿色背景，白色文字）
- 加载指示器
- 错误提示

**交互流程：**

```
1. 用户输入配置
   ↓
2. 点击"测试连接"
   ↓
3. 调用 webdav.testConnection()
   ↓
4. 连接成功 → 显示成功提示
   ↓
5. 点击"保存并登录"
   ↓
6. 保存配置到 storage
   ↓
7. 导航到 TimelineScreen
```

**错误处理：**
- 输入验证：检查必填字段
- 连接失败：显示错误信息（网络错误、认证失败等）
- 保存失败：显示错误信息

**状态管理：**

```typescript
const [config, setConfig] = useState<WebDAVConfig>({
  serverUrl: 'https://dav.jianguoyun.com/dav/',
  username: '',
  password: '',
  dataPath: '/论文管理/data/'
})
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

---

### 2. TimelineScreen（版本列表页面）

**UI 设计：** 见 `移动端UI/pencil-new.pen` 中的 TimelineScreen

**功能：**
- 显示论文版本列表
- 支持下拉刷新
- 支持排序切换（正序/倒序）
- 点击版本卡片查看详情（后续阶段）

**UI 元素：**
- 顶部导航栏（深绿色背景 `#2D5A4A`）
  - 标题："论文版本历史"
  - 排序按钮（浅蓝色背景 `#E8F4FD`）
  - 设置按钮（浅蓝色背景 `#E8F4FD`）
- 版本列表（FlatList）
  - 每个版本卡片显示：
    - 版本号（粗体，18px）
    - 日期（右上角，灰色）
    - 修改内容（14px）
    - 当前重点（13px，灰色）
    - 文件信息（图标 + 文件名 + 大小）
- 下拉刷新指示器
- 空状态提示

**数据流：**

```
1. 进入页面
   ↓
2. 从缓存加载（快速显示）
   ↓
3. 后台从 WebDAV 拉取最新数据
   ↓
4. 对比 dataVersion
   ↓
5. 如有更新 → 刷新列表
   ↓
6. 用户下拉刷新 → 强制从 WebDAV 重新加载
```

**排序逻辑：**
- 默认：倒序（最新版本在前）
- 点击排序按钮：切换正序/倒序
- 排序依据：版本日期

**状态管理：**

```typescript
const [versions, setVersions] = useState<Version[]>([])
const [loading, setLoading] = useState(true)
const [refreshing, setRefreshing] = useState(false)
const [error, setError] = useState<string | null>(null)
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
```

---

### 3. VersionCard 组件

**职责：** 显示单个版本信息

**Props：**

```typescript
interface VersionCardProps {
  version: Version
  onPress: () => void
}
```

**UI 元素：**
- 白色卡片背景
- 圆角 12px
- 阴影效果
- 内边距 16px
- 垂直布局，间距 12px

**使用 shared 包工具函数：**
- `formatDate(version.date)` - 格式化日期
- `formatFileSize(version.fileSize)` - 格式化文件大小
- `getFileIcon(version.fileName)` - 获取文件图标

---

## 导航设计

### 导航结构

使用 React Navigation 的 Stack Navigator：

```
App
├── LoginScreen（首次启动或未登录）
└── TimelineScreen（已登录）
```

### 导航流程

```
应用启动
   ↓
检查是否有保存的配置
   ↓
有配置？
   ├─ 是 → TimelineScreen
   └─ 否 → LoginScreen
              ↓
         登录成功
              ↓
         TimelineScreen
              ↓
         点击设置按钮
              ↓
         LoginScreen（可修改配置）
```

### 导航配置

```typescript
const Stack = createStackNavigator()

function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  
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
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Timeline" component={TimelineScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

---

## 自定义 Hook 设计

### useVersions Hook

**职责：** 封装版本列表的数据逻辑

**接口：**

```typescript
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

function useVersions(
  webdav: WebDAVService,
  cache: CacheService
): UseVersionsResult
```

**实现逻辑：**

```typescript
const loadVersions = useCallback(async (forceRefresh = false) => {
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
    if (forceRefresh || await cache.needsUpdate(data.dataVersion)) {
      await cache.cacheVersions(data)
      setVersions(data.versions)
    }
  } catch (err) {
    const errorMessage = handleError(err)
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
}, [webdav, cache, versions.length])
```

---

## 配色方案

**与桌面端保持一致：**

| 颜色名称 | 十六进制 | 用途 |
|---------|---------|------|
| Primary | `#2D5A4A` | 主色（导航栏、按钮） |
| Accent | `#E8F4FD` | 强调色（图标背景） |
| Background | `#F5F7FA` | 页面背景 |
| Card | `#FFFFFF` | 卡片背景 |
| Text | `#333333` | 主要文字 |
| Muted | `#6B7280` | 次要文字 |
| Border | `#DDE3EA` | 边框 |
| Danger | `#B83B3B` | 错误提示 |

---

## Metro 配置

### 支持 Monorepo

**metro.config.js：**

```javascript
const path = require('path')
const { getDefaultConfig } = require('@react-native/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

module.exports = (async () => {
  const config = await getDefaultConfig(projectRoot)
  
  return {
    ...config,
    watchFolders: [workspaceRoot],
    resolver: {
      ...config.resolver,
      nodeModulesPaths: [
        path.resolve(projectRoot, 'node_modules'),
        path.resolve(workspaceRoot, 'node_modules'),
      ],
    },
  }
})()
```

**说明：**
- `watchFolders`：监听整个 workspace
- `nodeModulesPaths`：解析 shared 包的依赖

---

## 依赖管理

### package.json

```json
{
  "name": "@thesis-tracker/mobile",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "start": "react-native start",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "react-native-screens": "^3.29.0",
    "react-native-safe-area-context": "^4.8.0",
    "react-native-gesture-handler": "^2.14.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.0",
    "axios": "^1.6.0",
    "@thesis-tracker/shared": "*"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0"
  }
}
```

**说明：**
- `react-native-screens`：React Navigation 必需依赖，提供原生屏幕组件
- `react-native-safe-area-context`：处理安全区域（刘海屏、底部导航栏）
- `react-native-gesture-handler`：提供手势处理能力

### TypeScript 配置

**tsconfig.json：**

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
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "android", "ios"]
}
```

**说明：**
- `paths` 配置允许直接引用 shared 包
- `strict` 启用严格类型检查
- `skipLibCheck` 跳过第三方库的类型检查（提升编译速度）

---

## 错误处理

### 错误类型

```typescript
class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
```

### 统一错误处理

**错误处理工具函数：**

```typescript
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

**错误边界组件：**

```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>出错了</Text>
          <Text style={styles.errorMessage}>
            {handleError(this.state.error!)}
          </Text>
          <Button
            title="重新加载"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      )
    }
    return this.props.children
  }
}
```

**在 App.tsx 中使用：**

```typescript
function App() {
  return (
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  )
}
```

### 错误处理策略

1. **网络错误**：显示"网络连接失败，请检查网络设置"
2. **认证错误**：显示"用户名或密码错误"
3. **文件不存在**：显示"数据文件不存在，请检查路径"
4. **未知错误**：显示"发生未知错误，请稍后重试"

### 用户提示

- 使用 Toast 显示简短提示
- 使用 Alert 显示重要错误
- 错误信息使用中文

---

## 性能优化

### 列表优化

- 使用 `FlatList` 的虚拟化
- 设置 `keyExtractor`
- 使用 `getItemLayout` 优化滚动性能

### 缓存策略

- 首次加载使用缓存（快速启动）
- 后台异步更新
- 避免频繁网络请求

### 图片优化

- 暂无图片（后续阶段添加）

---

## 测试策略

### 单元测试

- 测试 Service 层逻辑
- 测试 Hook 逻辑
- 测试工具函数

### 集成测试

- 测试页面交互流程
- 测试导航流程

### 手动测试

- 测试真实设备上的表现
- 测试网络异常情况
- 测试离线模式

---

## 开发流程

### 阶段划分

**阶段 2.1：项目初始化**
1. 创建 React Native 项目
2. 配置 Metro 支持 monorepo
3. 配置 TypeScript
4. 安装依赖

**阶段 2.2：服务层开发**
1. 实现 StorageService
2. 实现 WebDAVService
3. 实现 CacheService
4. 编写单元测试

**阶段 2.3：UI 开发**
1. 实现 LoginScreen
2. 实现 TimelineScreen
3. 实现 VersionCard 组件
4. 配置导航

**阶段 2.4：集成测试**
1. 测试登录流程
2. 测试版本列表加载
3. 测试缓存机制
4. 测试错误处理

---

## 验收标准

完成阶段 2 后，应满足以下条件：

- [ ] React Native 项目已创建，Android 可以正常运行
- [ ] Metro 配置正确，可以引用 shared 包
- [ ] LoginScreen 可以输入配置并测试连接
- [ ] 配置可以保存到本地存储（密码加密）
- [ ] TimelineScreen 可以显示版本列表
- [ ] 版本列表支持下拉刷新
- [ ] 版本列表支持排序切换
- [ ] 离线模式下可以查看缓存的版本列表
- [ ] 错误处理完善，用户体验良好
- [ ] 代码通过 TypeScript 类型检查
- [ ] UI 与桌面端配色一致

---

## 下一步

完成阶段 2 后，可以继续：

- **阶段 3**：实现版本详情页面
- **阶段 4**：实现文件下载和预览功能
- **阶段 5**：iOS 平台适配
- **阶段 6**：性能优化和用户体验改进

---

## 附录

### UI 设计文件

- **文件位置**：`G:\我的云端硬盘\AI产品\论文管理\移动端UI\pencil-new.pen`
- **包含页面**：
  - LoginScreen（登录/配置页面）
  - TimelineScreen（版本列表页面）

### 参考文档

- React Native 官方文档：https://reactnative.dev/
- React Navigation 文档：https://reactnavigation.org/
- AsyncStorage 文档：https://react-native-async-storage.github.io/async-storage/
- Keychain 文档：https://github.com/oblador/react-native-keychain

---

**文档版本历史：**

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|---------|
| 1.0 | 2026-05-04 | Claude | 初始版本 |
