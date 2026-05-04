---
name: 多设备同步（坚果云方案）
description: 通过拆分数据文件 + 文件监听实现两台电脑通过坚果云自动同步论文数据
type: feature
---

# 多设备同步设计文档（坚果云方案）

## 概述

实现两台电脑通过坚果云共享同一个数据目录，自动同步所有论文数据。核心思路：将单一 `data.json` 拆分为按论文独立的数据文件，配合文件监听实现实时刷新。不需要云端后台、不需要账号登录。

### 前提条件

- 用户使用坚果云同步数据目录
- 两台电脑可能同时打开软件，但不会同时编辑同一篇论文
- 需要同步所有信息：版本号、修改变更、当前重点等

## 功能 1：数据结构重新设计

### 当前结构

```
data/
  data.json              ← 包含所有论文列表 + 所有版本信息 + currentThesisId
  files/
    <论文名>/
      版本文件...
```

### 新结构

```
data/
  theses-index.json      ← 只存论文列表 { theses: [...] }
  <论文名>/
    versions.json        ← 该论文的版本列表 { versions: [...] }
    版本文件...           ← 论文文件也放在这里
```

### 设计要点

- `currentThesisId` 不再存在共享目录里，改为存在各电脑本地的 `userData/local-state.json` 中（两台电脑可能在看不同的论文，这是本机状态）
- 编辑论文 A 只写 `<论文A>/versions.json`，编辑论文 B 只写 `<论文B>/versions.json`，互不干扰
- `theses-index.json` 只在创建/删除/重命名论文时才写入，频率很低
- 每篇论文的文件和元数据放在同一个目录下，结构更清晰

### theses-index.json 格式

```typescript
interface ThesesIndex {
  theses: Array<{
    id: string
    title: string
    description?: string
    createdAt: string
    updatedAt: string
  }>
}
```

### versions.json 格式

```typescript
interface ThesisVersions {
  versions: Array<{
    id: string
    thesisId: string
    version: string
    date: string
    changes?: string
    focus?: string
    filePath?: string   // 相对于论文目录的路径
    fileName?: string
    fileType?: string
  }>
}
```

### local-state.json 格式（存在 userData 目录，不同步）

```typescript
interface LocalState {
  currentThesisId: string | null
}
```

### filePath 变更

版本中的 `filePath` 从绝对路径改为相对于论文目录的路径（只存文件名）。读取时由主进程拼接完整路径。这样不同电脑的数据目录路径不同也不影响。

## 功能 2：文件监听与自动刷新

### 技术选型

使用 `chokidar`（成熟的 Node.js 文件监听库）监听数据目录。

### 监听策略

- 监听 `data/theses-index.json` 的变化 → 刷新论文列表
- 监听 `data/*/versions.json` 的变化 → 刷新对应论文的版本列表
- 只监听 `.json` 文件变化，忽略论文文件本身（PDF/DOCX 等）

### 防抖处理

- 坚果云同步时可能触发多次文件变化事件
- 加 500ms 防抖，合并短时间内的多次变化为一次刷新

### 避免自触发

- 本机写入文件后设置 2 秒"静默期"标记
- 静默期内的文件变化事件忽略，避免自己写的文件又触发自己刷新

### 通知机制

- 主进程（Main Process）负责文件监听
- 检测到变化后通过 IPC 通知渲染进程（`webContents.send`）
- 渲染进程收到通知后重新加载对应数据

```
坚果云同步文件 → chokidar 检测到变化 → 防抖 500ms →
检查是否自触发 → 否 → IPC 通知渲染进程 → 刷新 UI
```

### 涉及文件修改

**新建：`src/main/file-watcher.ts`**

```typescript
// 核心接口
interface FileWatcher {
  start(dataDir: string): void
  stop(): void
  onThesesIndexChanged(callback: () => void): void
  onVersionsChanged(callback: (thesisDir: string) => void): void
  onConflictDetected(callback: (filePath: string) => void): void
  setSilent(duration: number): void  // 写入后调用，抑制自触发
}
```

**修改：`src/main/ipc-handlers.ts`**

- 在 `initializeApp()` 中启动文件监听
- 所有写入操作后调用 `watcher.setSilent(2000)`
- 新增 IPC 事件：`sync-theses-updated`、`sync-versions-updated`、`sync-conflict-detected`

**修改：`src/renderer/App.tsx`**

- 监听新的 IPC 同步事件
- 收到 `sync-theses-updated` 时重新加载论文列表
- 收到 `sync-versions-updated` 时重新加载当前论文的版本列表
- 收到 `sync-conflict-detected` 时显示警告提示

**修改：`src/preload/preload.ts`**

- 暴露新的同步事件监听 API

## 功能 3：数据迁移（旧格式 → 新格式）

### 迁移流程

应用启动时自动检测并迁移，用户无感知：

1. 启动时检查数据目录下是否存在旧的 `data.json`
2. 如果存在，读取并拆分：
   - 从 `data.theses` 生成 `theses-index.json`
   - 为每篇论文创建 `<论文名>/versions.json`（从 `data.versions` 中按 `thesisId` 筛选）
   - 将 `files/<论文名>/` 下的文件移动到 `<论文名>/` 目录下
   - 将 `filePath` 从绝对路径转换为相对路径（文件名）
3. 将 `currentThesisId` 写入本机 `userData/local-state.json`
4. 迁移成功后将旧文件重命名为 `data.json.backup`

### 安全措施

- 先写入所有新文件，确认全部成功后才重命名旧文件
- 如果迁移中途失败，旧 `data.json` 保持不变，下次启动重试
- 两台电脑各自独立迁移，不会冲突（迁移后的文件结构一致，坚果云自动去重）

### 涉及文件修改

**新建：`src/main/data-migration.ts`**

```typescript
// 核心函数
function migrateToSplitFormat(dataDir: string, userDataPath: string): boolean
function needsMigration(dataDir: string): boolean
```

**修改：`src/main/ipc-handlers.ts`**

- 在 `initializeApp()` 中调用迁移检测

## 功能 4：冲突处理与边界情况

### theses-index.json 冲突

- 写入前先重新读取文件，合并变更后再写入（read-merge-write）
- 合并逻辑：取两边论文列表的并集（新增的都保留），删除的以最新操作为准

### 坚果云冲突副本检测

- 坚果云冲突时生成类似 `versions (冲突副本 2026-04-09).json` 的文件
- 文件监听时检测是否存在包含"冲突副本"或"SyncConflict"关键词的文件
- 检测到后通过 IPC 通知渲染进程显示警告
- 不自动合并冲突副本，交给用户判断

### 应用未运行时的同步

- 电脑 B 关闭期间，电脑 A 做了多次修改
- 坚果云把最终状态同步过来
- 电脑 B 下次打开软件时直接读取最新文件，无需特殊处理

## 功能 5：UI 变化

### 侧边栏同步状态指示

在侧边栏底部（设置按钮附近）显示同步状态：
- 正常状态：显示"已同步"+ 绿色小圆点
- 检测到外部变化并刷新后：短暂显示"已更新"toast（3 秒后消失）
- 检测到冲突副本：显示黄色警告图标 + "检测到同步冲突"

### 数据刷新体验

- 刷新过程对用户透明，界面直接更新为最新数据
- 如果用户正在查看的论文有新版本，时间线自动更新
- 如果其他电脑新建了论文，侧边栏论文列表自动出现

### 设置弹窗

- 现有设置弹窗不需要大改
- 加一行提示文字："将数据目录设置为坚果云同步文件夹即可实现多设备同步"

### 不新增的东西

- 不加登录页面
- 不加复杂的同步配置界面
- 不加手动同步按钮（自动同步）

### 涉及文件修改

**修改：`src/renderer/components/Sidebar.tsx`**

- 添加同步状态指示组件

**修改：`src/renderer/App.tsx`**

- 管理同步状态 state
- 处理同步相关 IPC 事件

**修改：`src/renderer/components/SettingsModal.tsx`**

- 添加坚果云同步提示文字

## 实施顺序

1. 新建数据读写层（按新结构读写 theses-index.json 和 per-thesis versions.json）
2. 实现数据迁移（旧 data.json → 新结构）
3. 重构 ipc-handlers.ts 使用新数据层
4. 实现文件监听模块（chokidar + 防抖 + 自触发抑制）
5. 集成文件监听到主进程，添加 IPC 同步事件
6. 更新 preload 和 renderer 类型定义
7. 更新 UI（同步状态指示、设置弹窗提示）
8. 测试所有场景

## 风险与注意事项

- **filePath 变更影响**：版本中的 filePath 从绝对路径改为相对路径，需要检查所有使用 filePath 的地方（打开文件、复制文件、编辑会话等）
- **chokidar 依赖**：需要新增 npm 依赖，Electron 打包时需确认兼容性
- **坚果云同步延迟**：坚果云同步不是即时的，可能有几秒到几十秒的延迟，用户需要理解这不是实时协作工具
- **大文件同步**：论文文件（PDF/DOCX）较大时，坚果云同步可能需要更长时间，但这不影响元数据（versions.json）的同步
- **编辑会话兼容**：现有的编辑会话功能（edit-session）需要适配新的数据结构
