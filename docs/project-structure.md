# 项目结构说明

## 总览

```
Thesis-Progress-Tracker/
├── src/                        # 桌面端（Electron + React）
├── mobile/                     # 移动端（Expo / React Native）
├── shared/                     # 共享类型和工具函数
├── tests/                      # 测试
├── docs/                       # 文档
├── .github/workflows/          # CI/CD
├── package.json                # 桌面端依赖
├── vite.config.ts              # 前端构建配置
├── electron-builder.json       # 桌面端打包配置
├── tailwind.config.cjs
├── tsconfig.json
└── tsconfig.main.json
```

---

## 桌面端 `src/`

基于 Electron + React + TypeScript，数据存储在本地文件系统。

```
src/
├── main/                       # Electron 主进程
│   ├── index.ts                # 入口，创建窗口、注册 IPC
│   ├── ipc-handlers.ts         # 所有 IPC 事件处理
│   ├── split-data-store.ts     # 数据读写（JSON 文件）
│   ├── data-dir-config.ts      # 数据目录配置和持久化
│   ├── data-migration.ts       # 旧数据格式迁移
│   ├── path-resolver.ts        # 文件路径解析
│   ├── file-watcher.ts         # 监听文件变化
│   ├── edit-session.ts         # 编辑会话管理
│   ├── edit-session-types.ts   # 编辑会话类型定义
│   ├── version-utils.ts        # 版本号工具函数
│   └── updater.ts              # 自动更新
├── preload/
│   └── preload.ts              # 暴露给渲染进程的 API（contextBridge）
└── renderer/                   # React 前端
    ├── App.tsx                 # 根组件，路由和状态管理
    ├── main.tsx                # 渲染进程入口
    ├── index.html
    ├── index.css               # 全局样式（Tailwind）
    ├── types.ts                # 渲染层类型定义
    └── components/
        ├── Sidebar.tsx         # 左侧边栏（论文列表入口）
        ├── ThesisList.tsx      # 论文列表
        ├── ThesisListItem.tsx  # 论文列表单项
        ├── Timeline.tsx        # 版本时间线
        ├── VersionCard.tsx     # 时间线版本卡片
        ├── VersionDetailModal.tsx  # 版本详情弹窗
        ├── EditVersionModal.tsx    # 编辑版本信息弹窗
        ├── NewThesisModal.tsx      # 新建论文弹窗
        ├── UploadModal.tsx         # 上传新版本弹窗
        ├── EditSessionBar.tsx      # 编辑会话状态栏
        └── SettingsModal.tsx       # 设置弹窗（数据目录等）
```

---

## 移动端 `mobile/`

基于 Expo (React Native)，通过坚果云 WebDAV 读取数据，不写入。

```
mobile/
├── App.tsx                     # 根组件，导航配置
├── index.ts                    # Expo 入口
├── app.json                    # Expo 配置（名称、图标、bundle ID）
├── eas.json                    # EAS Build 打包配置
├── proxy.js                    # 本地开发用 CORS 代理（仅 web 模式）
├── tsconfig.json
├── assets/                     # 图标和启动图
│   ├── icon.png
│   ├── adaptive-icon.png       # Android 自适应图标
│   ├── splash-icon.png
│   └── favicon.png
└── src/
    ├── screens/
    │   ├── LoginScreen.tsx     # WebDAV 登录配置页
    │   └── TimelineScreen.tsx  # 文件浏览 + 版本时间线页
    └── services/
        ├── webdav.ts           # WebDAV 请求（列目录、下载文件）
        └── storage.ts          # 本地凭据持久化（expo-secure-store）
```

---

## 共享模块 `shared/`

桌面端和移动端共用的类型定义和工具函数。

```
shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types/
    │   ├── Version.ts          # 版本数据结构
    │   ├── Config.ts           # 配置数据结构
    │   └── index.ts
    └── utils/
        ├── dateFormat.ts       # 日期格式化
        ├── fileUtils.ts        # 文件名、扩展名处理
        ├── validation.ts       # 输入校验
        └── index.ts
```

---

## 测试 `tests/`

使用 Vitest，覆盖主进程逻辑和发布配置。

```
tests/
├── main/                       # 主进程单元测试
│   ├── split-data-store.test.ts
│   ├── data-dir-config.test.ts
│   ├── data-migration.test.ts
│   ├── edit-session.test.ts
│   ├── file-watcher.test.ts
│   ├── path-resolver.test.ts
│   ├── version-utils.test.ts
│   ├── ipc-data-path.test.ts
│   ├── edit-session-ipc-contract.test.ts
│   └── edit-from-version-contract.test.ts
└── release/                    # 发布配置契约测试
    ├── electron-builder-config.test.ts
    ├── package-scripts.test.ts
    ├── preload-api-contract.test.ts
    ├── release-docs.test.ts
    └── settings-ui-contract.test.ts
```

---

## 配置文件

### 根目录（桌面端）

**`package.json`** — 桌面端依赖和 npm scripts

| script | 说明 |
|---|---|
| `npm run dev` | 同时启动 Vite 开发服务器和 Electron |
| `npm run build` | 构建渲染进程 + 编译主进程 |
| `npm run test` | 运行 Vitest 测试 |
| `npm run release:local` | 构建并打包 Windows NSIS 安装包 |
| `npm run release:mac` | 构建并打包 macOS DMG（x64） |
| `npm run release:mac-arm` | 构建并打包 macOS DMG（arm64） |

主要依赖：`electron ^28`、`react ^18`、`vite ^5`、`chokidar`、`uuid`

---

**`electron-builder.json`** — Electron 打包配置

| 字段 | 值 | 说明 |
|---|---|---|
| `appId` | `com.thesis-tracker.app` | 应用唯一标识 |
| `productName` | `Thesis Progress Tracker` | 应用名称 |
| `directories.output` | `release/` | 打包输出目录 |
| `files` | `dist/**/*` | 打包包含的文件 |
| `win.target` | `nsis x64` | Windows 安装包格式 |
| `nsis.oneClick` | `false` | 允许用户选择安装目录 |
| `mac.target` | `dmg x64 + arm64` | macOS 磁盘镜像，双架构 |
| `mac.category` | `productivity` | App Store 分类 |

---

**`vite.config.ts`** — 渲染进程构建配置

| 字段 | 值 | 说明 |
|---|---|---|
| `root` | `src/renderer` | 源码根目录 |
| `build.outDir` | `dist/renderer` | 构建输出 |
| `base` | `./` | 相对路径，Electron 加载本地文件需要 |
| `resolve.alias @` | `src/renderer` | 路径别名 |
| `server.port` | `5173` | 开发服务器端口（固定，Electron 依赖此端口） |

---

**`tsconfig.json`** — 渲染进程 TypeScript 配置

- target: `ES2020`，module: `ESNext`，moduleResolution: `bundler`
- `noEmit: true`（由 Vite 处理编译输出）
- 路径别名 `@/*` → `src/renderer/*`
- references 指向 `tsconfig.main.json`

**`tsconfig.main.json`** — 主进程 TypeScript 配置

- target: `ES2020`，module: `CommonJS`（Node.js 环境）
- outDir: `dist/`，rootDir: `src/`
- 包含 `src/main/**/*` 和 `src/preload/**/*`

---

### 移动端 `mobile/`

**`app.json`** — Expo 应用配置

| 字段 | 值 | 说明 |
|---|---|---|
| `name` | `论文版本历史` | 显示名称 |
| `slug` | `thesis-timeline` | EAS 项目标识 |
| `version` | `1.0.0` | 应用版本 |
| `android.package` | `com.thesis.timeline` | Android 包名 |
| `ios.bundleIdentifier` | `com.thesis.timeline` | iOS Bundle ID |
| `newArchEnabled` | `true` | 启用 React Native 新架构 |
| `plugins` | `expo-secure-store` | 安全存储插件 |
| `extra.eas.projectId` | `92611020-...` | EAS 云端项目 ID |

---

**`eas.json`** — EAS Build 打包配置

| profile | 说明 |
|---|---|
| `development` | 开发构建，包含 dev client，内部分发 |
| `preview` | 预览构建，内部分发（生成 APK，可直接安装） |
| `production` | 生产构建，自动递增版本号 |

`cli.appVersionSource: remote` — 版本号由 EAS 服务端管理。

---

**`mobile/package.json`** — 移动端依赖

主要依赖：

| 包 | 版本 | 用途 |
|---|---|---|
| `expo` | ~54 | 核心框架 |
| `react-native` | 0.81.5 | 原生渲染 |
| `@react-navigation/native-stack` | ^7 | 页面导航 |
| `expo-secure-store` | ~15 | 安全存储登录凭据 |
| `expo-file-system` | ~19 | 下载文件到本地缓存 |
| `expo-sharing` | ~14 | 调用系统分享/打开文件 |
| `axios` | ^1 | HTTP 请求（WebDAV） |

---

## 数据流

```
桌面端
  本地文件系统 (data/) ──► split-data-store.ts ──► IPC ──► React UI

移动端
  坚果云 WebDAV ──► webdav.ts ──► TimelineScreen
```

桌面端负责写入数据（上传版本、编辑记录），移动端只读，通过 WebDAV 直接访问坚果云上的文件。

---

## 配置文件说明

### 桌面端

**`package.json`** — 桌面端依赖和 npm scripts

| script | 用途 |
|---|---|
| `npm run dev` | 同时启动 Vite 开发服务器和 Electron |
| `npm run build` | 构建渲染进程 + 编译主进程 |
| `npm run release:local` | 构建并打包 Windows NSIS 安装包 |
| `npm run release:mac` | 构建并打包 macOS DMG（x64） |
| `npm run release:mac-arm` | 构建并打包 macOS DMG（arm64） |
| `npm test` | 运行所有 Vitest 测试 |

主要依赖：`electron 28`、`react 18`、`chokidar`（文件监听）、`uuid`

**`vite.config.ts`** — 渲染进程构建

- root：`src/renderer`
- 输出：`dist/renderer`
- 路径别名：`@` → `src/renderer`
- 开发服务器端口：`5173`（strictPort，不自动换端口）

**`tsconfig.json`** — 渲染进程 TypeScript 配置

- target：ES2020，module：ESNext，moduleResolution：bundler
- jsx：react-jsx，strict 模式开启
- 路径别名：`@/*` → `src/renderer/*`
- 引用 `tsconfig.main.json`（project references）

**`tsconfig.main.json`** — 主进程 TypeScript 配置

- target：ES2020，module：CommonJS（Node.js 兼容）
- 输出：`dist/`，rootDir：`src/`
- 覆盖范围：`src/main/**/*`、`src/preload/**/*`

**`electron-builder.json`** — 桌面端打包配置

| 字段 | 值 |
|---|---|
| appId | `com.thesis-tracker.app` |
| productName | `Thesis Progress Tracker` |
| 输出目录 | `release/` |
| 打包来源 | `dist/**/*` |
| Windows | NSIS 安装包，x64，支持自定义安装目录，创建桌面和开始菜单快捷方式 |
| macOS | DMG，x64 + arm64，category：productivity |

---

### 移动端

**`mobile/app.json`** — Expo 应用配置

| 字段 | 值 |
|---|---|
| name | 论文版本历史 |
| slug | thesis-timeline |
| version | 1.0.0 |
| iOS bundle ID | `com.thesis.timeline` |
| Android package | `com.thesis.timeline` |
| 新架构 | 开启（newArchEnabled: true） |
| 插件 | expo-secure-store |
| EAS project ID | `92611020-52ea-4d8d-ae34-4f15c44e756e` |

**`mobile/eas.json`** — EAS Build 打包配置

| profile | 用途 |
|---|---|
| `development` | 开发客户端，内部分发 |
| `preview` | 内部分发 APK，用于测试安装 |
| `production` | 正式发布，自动递增版本号 |

打包命令：`eas build --platform android --profile preview`

**`mobile/package.json`** — 移动端依赖

主要依赖：

| 包 | 用途 |
|---|---|
| `expo ~54` | Expo SDK |
| `react-native 0.81.5` | RN 运行时 |
| `expo-file-system` | 下载文件到本地缓存 |
| `expo-sharing` | 调用系统分享/打开文件 |
| `expo-secure-store` | 加密存储 WebDAV 凭据 |
| `@react-navigation/native-stack` | 页面导航 |
| `axios` | HTTP 请求（WebDAV） |

**`mobile/tsconfig.json`** — 继承 `expo/tsconfig.base`，开启 strict 模式
