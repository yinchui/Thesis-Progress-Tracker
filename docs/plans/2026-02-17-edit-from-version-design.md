# 基于版本修改 — 设计文档

> 日期：2026-02-17
> 状态：已确认

## 概述

用户在版本详情中点击「基于此版本修改」，预填版本信息后，应用复制文件并用系统程序打开。用户在外部编辑器中编辑保存，应用通过锁文件检测或手动确认完成归档，将编辑后的文件保存为新版本。

## 用户流程

```
版本详情弹窗 → 点击「基于此版本修改」
  → 弹出 EditVersionModal（版本号/修改内容/重点/文件上传区）
    - 版本号自动递增（v1.0 → v1.1）
    - 文件区默认显示从旧版本复制的文件，可替换为手动上传
  → 确认 → 复制文件到最终位置，系统程序打开
  → 编辑状态栏出现在时间线顶部
  → 用户在 Word/WPS 中编辑、多次保存
  → [doc/docx] 关闭文件时自动归档（锁文件检测）
  → [txt/pdf等] 用户手动点「完成修改」归档
  → 新版本出现在时间线顶部，toast 提示 "vX.X 已保存"
```

## UI 设计

### 1. 版本详情弹窗

在现有「编辑」「删除」按钮旁新增「基于此版本修改」按钮，主色调样式（与「上传新版本」同级别）。

### 2. EditVersionModal

复用 `UploadModal` 的表单布局：

- **文件上传区**：默认预填旧版本文件名（显示"已从 vX.X 复制：filename.docx"），用户可点击替换为手动上传的文件。
- **版本号**：自动递增，可手动修改。
- **修改内容**：空白，用户填写。
- **当前重点**：空白，用户填写。
- 提交按钮文案：「开始编辑」。

### 3. 编辑状态栏 (EditSessionBar)

位于时间线区域顶部，标题下方，固定显示。

对于 doc/docx（自动归档）：
```
┌──────────────────────────────────────────────────┐
│ 📝 正在编辑 v1.1（基于 v1.0）  等待关闭文件…  [取消] │
└──────────────────────────────────────────────────┘
```

对于 txt/pdf 等（手动归档）：
```
┌────────────────────────────────────────────────────────────┐
│ 📝 正在编辑 v1.1（基于 v1.0）       [取消编辑] [完成修改] │
└────────────────────────────────────────────────────────────┘
```

背景色用 `accent`（浅蓝），与界面协调。

### 4. 编辑期间限制

- 「上传新版本」按钮禁用
- 不能切换论文

## 后端架构

### 新增 IPC 通道

| 通道 | 方向 | 作用 |
|------|------|------|
| `start-edit-session` | renderer → main | 创建编辑会话：复制文件、打开外部程序、启动监听 |
| `cancel-edit-session` | renderer → main | 取消编辑：停止监听、删除复制的临时文件 |
| `finish-edit-session` | main → renderer | 主进程通知渲染进程：编辑完成，新版本已归档 |

### EditSession 数据结构

```ts
interface EditSession {
  newVersionId: string       // 新版本 ID
  baseVersionId: string      // 基于哪个版本
  thesisId: string
  versionInfo: {             // 用户预填的信息
    version: string
    changes: string
    focus: string
  }
  editFilePath: string       // 复制出来的可编辑文件路径
  lockFilePattern: string    // 锁文件路径模式（如 ~$xxx.docx）
  fileType: string           // doc/docx/txt/pdf
  autoArchive: boolean       // 是否支持自动归档（doc/docx → true）
}
```

### start-edit-session 流程

1. 生成新版本 ID
2. 将原版本文件复制到论文目录：`data/files/thesis_{id}/version_{newId}.ext`（最终位置，无需二次移动）
3. 创建 EditSession 对象，保存在主进程内存 + 持久化到 `data/edit-session.json`
4. `shell.openPath()` 打开文件
5. 如果 `autoArchive === true`（doc/docx）：
   - 计算锁文件路径（同目录下 `~$version_{newId}.docx`）
   - 用 `fs.watch` 监听编辑文件所在目录
   - 检测到锁文件删除（防抖 2 秒）→ 执行归档 → 发送 `finish-edit-session`
6. 返回 EditSession 给渲染进程

### 归档逻辑

1. 停止 `fs.watch`
2. 将版本信息写入 `data.json`（与现有 `add-version` 逻辑一致）
3. 清空 EditSession，删除 `edit-session.json`
4. 通过 `webContents.send('finish-edit-session', newVersion)` 通知渲染进程

### 锁文件检测细节

- **Word**：打开 `abc.docx` 时创建 `~$abc.docx`（同目录）
- **WPS**：行为与 Word 一致
- **监听方式**：`fs.watch` 监听编辑文件所在目录，过滤锁文件名的 `rename` 事件
- **防抖**：锁文件删除后等待 2 秒再归档（Word 关闭时可能短暂删除再创建锁文件）

## 前端组件变化

### 新增组件

**EditSessionBar.tsx**

```ts
interface EditSessionBarProps {
  baseVersion: string        // "v1.0"
  newVersion: string         // "v1.1"
  autoArchive: boolean       // 是否自动归档
  onCancel: () => void       // 取消编辑
  onFinish: () => void       // 手动完成（仅 autoArchive=false 时可用）
}
```

**EditVersionModal.tsx**

复用 `UploadModal` 表单结构，增加基于旧版本的预填逻辑。

### App.tsx 状态变化

```ts
const [editSession, setEditSession] = useState<EditSession | null>(null)
const [showEditModal, setShowEditModal] = useState(false)
const [editBaseVersion, setEditBaseVersion] = useState<Version | null>(null)
```

### 事件流

```
VersionDetailModal
  → 点击「基于此版本修改」
  → App 记录 editBaseVersion，打开 EditVersionModal

EditVersionModal
  → 填写信息，点击「开始编辑」
  → App 调用 window.electronAPI.startEditSession(...)
  → 返回 EditSession → setEditSession(session)
  → 关闭 EditVersionModal 和 VersionDetailModal

EditSessionBar（显示中）
  → 「取消」→ App 调用 cancelEditSession → setEditSession(null)

主进程 finish-edit-session 事件
  → App 在 useEffect 中监听
  → 收到后 setEditSession(null)，重新 loadVersions，显示 toast
```

### Preload 新增 API

```ts
startEditSession: (params) => ipcRenderer.invoke('start-edit-session', params)
cancelEditSession: () => ipcRenderer.invoke('cancel-edit-session')
onEditSessionFinished: (callback) => ipcRenderer.on('finish-edit-session', callback)
removeEditSessionListener: () => ipcRenderer.removeAllListeners('finish-edit-session')
```

## 版本号自动递增

用正则 `/(\d+)(?!.*\d)/` 匹配版本号中最后一个数字，+1 替换。

| 旧版本号 | 建议值 | 规则 |
|----------|--------|------|
| `v1.0` | `v1.1` | 末尾数字 +1 |
| `v1.9` | `v1.10` | 末尾数字 +1 |
| `v2` | `v3` | 末尾数字 +1 |
| `第一稿` | `第一稿` | 无法解析，原样填入 |

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 文件复制失败 | 弹 alert，不进入编辑状态 |
| `shell.openPath` 失败 | 弹提示"未找到可打开此文件的程序"，不进入编辑状态 |
| 锁文件监听异常 | 降级为手动模式，状态栏显示「完成修改」按钮 |
| 应用意外退出 | 下次启动检查 `edit-session.json`，提示用户是否保留为新版本 |
| 用户取消编辑 | 删除已复制的文件，不写入 data.json |

## EditSession 持久化

为应对应用崩溃/意外退出：

- 启动编辑时写入 `data/edit-session.json`
- 归档或取消时删除该文件
- 应用启动时检查此文件是否存在，若存在弹窗提示："上次编辑 vX.X 未完成，是否保留为新版本？"
