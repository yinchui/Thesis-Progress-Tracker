# 论文进度管理器

> Thesis Progress Tracker — 论文版本管理工具，支持桌面端（Electron）和移动端（Android）

## 项目介绍

按时间线记录论文进度，支持上传论文版本、记录修改内容和重点、随时回看历史版本。数据存储在坚果云 WebDAV，桌面端和手机端共享同一份数据。

## 功能特性

- **版本管理**：上传论文不同版本，按时间线展示
- **修改记录**：记录每次修改的内容和当前重点
- **多端同步**：通过坚果云 WebDAV 同步，桌面端和手机端数据一致
- **文件浏览**：手机端可浏览文件夹、下载并打开论文文件
- **快速回看**：点击任意版本查看详情，支持直接打开文件

## 项目结构

```
Thesis-Progress-Tracker/
├── src/                  # 桌面端（Electron + React）
│   ├── main/             # Electron 主进程
│   ├── preload/          # 预加载脚本
│   └── renderer/         # React 前端
├── mobile/               # 移动端（Expo / React Native）
│   ├── src/
│   │   ├── screens/      # 页面组件
│   │   └── services/     # WebDAV、存储服务
│   └── app.json
├── shared/               # 共享类型和工具函数
├── tests/                # 测试
└── docs/                 # 文档
```

## 技术栈

| 端 | 技术 |
|---|---|
| 桌面端 | Electron + React + TypeScript + Tailwind CSS |
| 移动端 | Expo (React Native) + TypeScript |
| 数据存储 | 坚果云 WebDAV |

## 开发

### 桌面端

```bash
npm install
npm run dev
```

### 移动端

```bash
cd mobile
npm install
npx expo start
```

### 打包

桌面端：
```bash
npm run release:local
```

移动端（Android APK）：
```bash
cd mobile
eas build --platform android --profile preview
```

## 数据目录

桌面端默认使用程序目录下的 `data` 文件夹，可在设置中修改为自定义路径。移动端通过坚果云 WebDAV 直接读取。

## License

MIT
