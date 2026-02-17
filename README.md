# 论文进度管理器

> Thesis Progress Tracker - 桌面端论文版本管理工具

## 项目介绍

论文进度管理器是一款基于 Electron + React 开发的桌面端应用，用于按时间线记录论文进度。支持上传论文版本、记录修改内容和重点、随时回看历史版本。

## 功能特性

- **版本管理**：上传论文不同版本，按时间线展示
- **修改记录**：记录每次修改的内容和当前重点
- **文件管理**：本地存储论文文件，支持 PDF/DOC/DOCX/TXT
- **快速回看**：点击任意版本查看详情，支持直接打开文件
- **编辑删除**：支持编辑版本信息，删除不需要的版本

## 技术栈

- **前端框架**：React 18 + TypeScript
- **桌面框架**：Electron 28
- **样式方案**：Tailwind CSS
- **构建工具**：Vite
- **打包工具**：electron-packager

## 项目结构

```
thesis-tracker/
├── src/
│   ├── main/                 # Electron 主进程
│   │   ├── index.ts          # 入口文件
│   │   └── ipc-handlers.ts   # IPC 处理器
│   ├── preload/              # 预加载脚本
│   │   └── preload.ts
│   └── renderer/             # React 前端
│       ├── components/       # UI 组件
│       │   ├── Sidebar.tsx
│       │   ├── Timeline.tsx
│       │   ├── VersionCard.tsx
│       │   ├── UploadModal.tsx
│       │   └── VersionDetailModal.tsx
│       ├── App.tsx
│       ├── main.tsx
│       └── index.css
├── data/                     # 论文数据存储目录
├── release/                  # 打包输出
├── package.json
└── README.md
```

## 开发指南

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 打包发布

```bash
# 打包为可执行文件
npx electron-packager . "论文进度管理器" --platform=win32 --arch=x64 --out=release --overwrite --asar
```

## 数据存储

数据默认存储在项目目录下的 `data` 文件夹：

```
E:\AI项目\论文\data\
├── versions.json           # 版本记录数据
└── thesis_*.pdf/doc/docx  # 论文文件
```

## 使用说明

1. **上传新版本**：点击左侧"上传新版本"按钮
2. **填写信息**：输入版本号、修改内容、当前重点
3. **选择文件**：拖拽或点击选择论文文件
4. **查看历史**：点击时间线上的版本卡片查看详情
5. **打开文件**：点击文件名直接用系统默认程序打开

## 界面预览

- 左侧边栏：Logo、状态统计、上传按钮
- 右侧时间线：垂直版本列表
- 上传弹窗：拖拽上传 + 表单填写
- 详情弹窗：版本信息展示、编辑删除

## License

MIT

## Windows Installer Release

For a direct installable Windows build:

```bash
npm ci
npm run release:local
```

Then publish the generated `.exe` from `release/` to GitHub Releases.

Detailed guide: `docs/release/windows-github-release.md`.
