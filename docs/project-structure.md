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

## 数据流

```
桌面端
  本地文件系统 (data/) ──► split-data-store.ts ──► IPC ──► React UI

移动端
  坚果云 WebDAV ──► webdav.ts ──► TimelineScreen
```

桌面端负责写入数据（上传版本、编辑记录），移动端只读，通过 WebDAV 直接访问坚果云上的文件。
