# 阶段 1：Monorepo 基础架构搭建 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 Monorepo 基础架构，创建共享代码库，为移动端开发做准备

**Architecture:** 使用 npm workspaces 管理 Monorepo，创建 shared 包存放共享类型和工具函数，配置 TypeScript 和测试环境

**Tech Stack:** npm workspaces, TypeScript 5.3+, Jest

**Spec:** `docs/superpowers/specs/2026-05-04-mobile-app-monorepo-design.md`

---

## 前置条件

**工作目录：** `G:\我的云端硬盘\AI产品\论文管理`（Thesis-Progress-Tracker 的父目录）

**检查清单：**
- [ ] 确认当前在正确的工作目录
- [ ] 确认 Thesis-Progress-Tracker 目录存在
- [ ] 确认已安装 Node.js 18+ 和 npm
- [ ] 确认项目已初始化 Git 仓库

**目录切换：**
```bash
# 如果当前在 Thesis-Progress-Tracker 目录，先切换到父目录
cd "G:\我的云端硬盘\AI产品\论文管理"

# 验证目录结构
ls -la
# 应该看到 Thesis-Progress-Tracker/ 目录
```

---

## 文件结构规划

本阶段将创建以下文件结构：

```
论文管理/
├── package.json                           # 根 workspace 配置（新建）
├── .gitignore                            # 更新
├── shared/                               # 共享代码库（新建）
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── src/
│   │   ├── types/
│   │   │   ├── Version.ts
│   │   │   ├── Config.ts
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── dateFormat.ts
│   │   │   ├── fileUtils.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── __tests__/
│       ├── utils/
│       │   ├── dateFormat.test.ts
│       │   ├── fileUtils.test.ts
│       │   └── validation.test.ts
└── Thesis-Progress-Tracker/             # 现有桌面端（保持不变）
```

---

## Task 1: 创建根 workspace 配置

**Files:**
- Create: `package.json` (根目录)
- Modify: `.gitignore`

- [ ] **Step 1: 创建根 package.json**

在根目录（`G:\我的云端硬盘\AI产品\论文管理`）创建 `package.json`：

```json
{
  "name": "thesis-tracker-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "Thesis-Progress-Tracker",
    "shared"
  ],
  "scripts": {
    "dev:desktop": "cd Thesis-Progress-Tracker && npm run dev",
    "build:desktop": "cd Thesis-Progress-Tracker && npm run build",
    "test": "npm run test --workspaces --if-present",
    "test:shared": "cd shared && npm test",
    "lint": "npm run lint --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: 更新 .gitignore**

在根目录的 `.gitignore` 中添加（如果文件不存在则创建）：

```
# Dependencies
node_modules/
*/node_modules/

# Build outputs
dist/
build/
*/dist/
*/build/

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
.temp/
```

- [ ] **Step 3: 验证 workspace 配置**

Run: `npm install`

Expected: 成功安装依赖，创建根目录的 `node_modules`

- [ ] **Step 4: 提交**

```bash
git add package.json .gitignore
git commit -m "chore: setup monorepo with npm workspaces

- Add root package.json with workspace configuration
- Update .gitignore for monorepo structure
- Configure scripts for desktop and shared packages"
```

---

## Task 2: 创建 shared 包基础结构

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/jest.config.js`
- Create: `shared/src/index.ts`
- Create: `shared/__tests__/.gitkeep`

- [ ] **Step 1: 创建 shared 目录结构**

Run: `mkdir -p shared/src/types shared/src/utils shared/__tests__/utils`

Expected: 创建目录结构

- [ ] **Step 2: 创建 shared/package.json**

```json
{
  "name": "@thesis-tracker/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 3: 创建 shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

- [ ] **Step 4: 创建 shared/jest.config.js**

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

- [ ] **Step 5: 创建 shared/src/index.ts（空文件）**

```typescript
// Shared types and utilities for Thesis Tracker
// This file will export all shared modules

export * from './types';
export * from './utils';
```

- [ ] **Step 6: 安装 shared 包依赖**

Run: `cd shared && npm install`

Expected: 成功安装 Jest、TypeScript 等依赖

- [ ] **Step 7: 提交**

```bash
git add shared/
git commit -m "chore: create shared package structure

- Add package.json with test scripts
- Configure TypeScript with strict mode
- Setup Jest for unit testing
- Add coverage thresholds (80%)"
```

---

## Task 3: 实现共享类型定义

**Files:**
- Create: `shared/src/types/Version.ts`
- Create: `shared/src/types/Config.ts`
- Create: `shared/src/types/index.ts`

- [ ] **Step 1: 创建 Version.ts**

```typescript
/**
 * 论文版本数据类型
 */
export interface Version {
  /** 唯一标识 */
  id: string;
  /** 版本号（如 v2.0） */
  version: string;
  /** ISO 8601 格式日期 */
  date: string;
  /** 修改内容 */
  changes: string;
  /** 当前重点 */
  focus: string;
  /** 文件名 */
  fileName: string;
  /** 相对路径（相对于 data/ 目录） */
  filePath: string;
  /** 文件大小（字节） */
  fileSize?: number;
}

/**
 * 论文数据集合
 */
export interface ThesisData {
  /** 数据格式版本 */
  schemaVersion: string;
  /** 数据版本号（每次更新递增） */
  dataVersion: number;
  /** 版本列表 */
  versions: Version[];
  /** 最后修改时间 */
  lastModified: string;
}
```

- [ ] **Step 2: 创建 Config.ts**

```typescript
/**
 * WebDAV 配置
 */
export interface WebDAVConfig {
  /** WebDAV 服务器地址 */
  serverUrl: string;
  /** 用户名（邮箱） */
  username: string;
  /** 应用密码 */
  password: string;
  /** 数据目录路径（如 /论文管理/data/） */
  dataPath: string;
}

/**
 * 应用配置
 */
export interface AppConfig {
  /** WebDAV 配置 */
  webdav: WebDAVConfig;
  /** 排序方式 */
  sortOrder: 'asc' | 'desc';
  /** 最后同步时间 */
  lastSyncTime?: string;
}
```

- [ ] **Step 3: 创建 types/index.ts**

```typescript
export * from './Version';
export * from './Config';
```

- [ ] **Step 4: 更新 src/index.ts**

```typescript
// Shared types and utilities for Thesis Tracker
// This file will export all shared modules

export * from './types';
// export * from './utils';  // 将在下一个 task 中取消注释
```

- [ ] **Step 5: 验证类型定义**

Run: `cd shared && npx tsc --noEmit`

Expected: 无类型错误

- [ ] **Step 6: 提交**

```bash
git add shared/src/types/
git commit -m "feat(shared): add core type definitions

- Add Version and ThesisData interfaces
- Add WebDAVConfig and AppConfig interfaces
- Include JSDoc comments for all types"
```

---


## Task 4: 实现日期格式化工具（TDD）

**Files:**
- Create: `shared/src/utils/dateFormat.ts`
- Create: `shared/__tests__/utils/dateFormat.test.ts`

- [ ] **Step 1: 编写失败的测试**

创建 `shared/__tests__/utils/dateFormat.test.ts`：

```typescript
import { formatDate, formatDateTime, getRelativeTime } from '../../src/utils/dateFormat';

describe('dateFormat', () => {
  describe('formatDate', () => {
    it('should format ISO date to YYYY-MM-DD', () => {
      const result = formatDate('2026-04-10T10:30:00.000Z');
      expect(result).toBe('2026-04-10');
    });

    it('should handle different timezones', () => {
      const result = formatDate('2026-12-31T23:59:59.999Z');
      expect(result).toMatch(/2026-12-31|2027-01-01/); // 可能跨时区
    });
  });

  describe('formatDateTime', () => {
    it('should format ISO date to YYYY-MM-DD HH:mm', () => {
      const result = formatDateTime('2026-04-10T10:30:00.000Z');
      expect(result).toMatch(/2026-04-10 \d{2}:\d{2}/);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "刚刚" for very recent dates', () => {
      const now = new Date();
      const result = getRelativeTime(now.toISOString());
      expect(result).toBe('刚刚');
    });

    it('should return minutes for dates within an hour', () => {
      const date = new Date(Date.now() - 30 * 60000); // 30 minutes ago
      const result = getRelativeTime(date.toISOString());
      expect(result).toBe('30 分钟前');
    });

    it('should return hours for dates within a day', () => {
      const date = new Date(Date.now() - 5 * 3600000); // 5 hours ago
      const result = getRelativeTime(date.toISOString());
      expect(result).toBe('5 小时前');
    });

    it('should return days for dates within a week', () => {
      const date = new Date(Date.now() - 3 * 86400000); // 3 days ago
      const result = getRelativeTime(date.toISOString());
      expect(result).toBe('3 天前');
    });

    it('should return formatted date for dates older than a week', () => {
      const date = new Date(Date.now() - 10 * 86400000); // 10 days ago
      const result = getRelativeTime(date.toISOString());
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd shared && npx jest dateFormat.test.ts`

Expected: FAIL - 模块未找到

- [ ] **Step 3: 实现最小功能**

创建 `shared/src/utils/dateFormat.ts`：

```typescript
/**
 * 日期格式化工具
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const dateStr = formatDate(dateString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * 获取相对时间描述
 */
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

- [ ] **Step 4: 运行测试确认通过**

Run: `cd shared && npx jest dateFormat.test.ts`

Expected: PASS - 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add shared/src/utils/dateFormat.ts shared/__tests__/utils/dateFormat.test.ts
git commit -m "feat(shared): add date formatting utilities

- Add formatDate for YYYY-MM-DD format
- Add formatDateTime for YYYY-MM-DD HH:mm format
- Add getRelativeTime for human-readable time
- Include comprehensive unit tests"
```

---

## Task 5: 实现文件工具函数（TDD）

**Files:**
- Create: `shared/src/utils/fileUtils.ts`
- Create: `shared/__tests__/utils/fileUtils.test.ts`

- [ ] **Step 1: 编写失败的测试**

创建 `shared/__tests__/utils/fileUtils.test.ts`：

```typescript
import { formatFileSize, getFileExtension, getFileIcon } from '../../src/utils/fileUtils';

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1.0 MB');
      expect(formatFileSize(2415616)).toBe('2.3 MB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });
  });

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('thesis.pdf')).toBe('pdf');
      expect(getFileExtension('document.docx')).toBe('docx');
    });

    it('should handle multiple dots', () => {
      expect(getFileExtension('my.thesis.v2.pdf')).toBe('pdf');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('README')).toBe('');
    });

    it('should handle uppercase extensions', () => {
      expect(getFileExtension('FILE.PDF')).toBe('pdf');
    });
  });

  describe('getFileIcon', () => {
    it('should return PDF icon', () => {
      expect(getFileIcon('thesis.pdf')).toBe('📄');
    });

    it('should return DOC icon', () => {
      expect(getFileIcon('thesis.doc')).toBe('📝');
      expect(getFileIcon('thesis.docx')).toBe('📝');
    });

    it('should return TXT icon', () => {
      expect(getFileIcon('notes.txt')).toBe('📃');
    });

    it('should return default icon for unknown types', () => {
      expect(getFileIcon('data.xlsx')).toBe('📎');
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd shared && npx jest fileUtils.test.ts`

Expected: FAIL - 模块未找到

- [ ] **Step 3: 实现最小功能**

创建 `shared/src/utils/fileUtils.ts`：

```typescript
/**
 * 文件工具函数
 */

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length === 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * 获取文件图标
 */
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

- [ ] **Step 4: 运行测试确认通过**

Run: `cd shared && npx jest fileUtils.test.ts`

Expected: PASS - 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add shared/src/utils/fileUtils.ts shared/__tests__/utils/fileUtils.test.ts
git commit -m "feat(shared): add file utility functions

- Add formatFileSize for human-readable sizes
- Add getFileExtension to extract file extensions
- Add getFileIcon for file type icons
- Include comprehensive unit tests"
```

---

## Task 6: 实现数据验证工具（TDD）

**Files:**
- Create: `shared/src/utils/validation.ts`
- Create: `shared/__tests__/utils/validation.test.ts`

- [ ] **Step 1: 编写失败的测试**

创建 `shared/__tests__/utils/validation.test.ts`：

```typescript
import { isValidWebDAVUrl, isValidEmail, isValidDataPath } from '../../src/utils/validation';

describe('validation', () => {
  describe('isValidWebDAVUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(isValidWebDAVUrl('https://dav.jianguoyun.com/dav/')).toBe(true);
      expect(isValidWebDAVUrl('https://example.com/webdav')).toBe(true);
    });

    it('should accept valid HTTP URLs', () => {
      expect(isValidWebDAVUrl('http://localhost:8080/dav')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidWebDAVUrl('not-a-url')).toBe(false);
      expect(isValidWebDAVUrl('ftp://example.com')).toBe(false);
      expect(isValidWebDAVUrl('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isValidDataPath', () => {
    it('should accept valid paths', () => {
      expect(isValidDataPath('/论文管理/data/')).toBe(true);
      expect(isValidDataPath('/path/to/data')).toBe(true);
    });

    it('should reject invalid paths', () => {
      expect(isValidDataPath('relative/path')).toBe(false);
      expect(isValidDataPath('/')).toBe(false);
      expect(isValidDataPath('')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd shared && npx jest validation.test.ts`

Expected: FAIL - 模块未找到

- [ ] **Step 3: 实现最小功能**

创建 `shared/src/utils/validation.ts`：

```typescript
/**
 * 数据验证工具
 */

/**
 * 验证 WebDAV URL 是否有效
 */
export function isValidWebDAVUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * 验证邮箱地址是否有效
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证数据路径是否有效
 */
export function isValidDataPath(path: string): boolean {
  if (!path) return false;

  // 必须以 / 开头（绝对路径）
  if (!path.startsWith('/')) return false;

  // 不能只是根路径
  if (path === '/') return false;

  return true;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd shared && npx jest validation.test.ts`

Expected: PASS - 所有测试通过

- [ ] **Step 5: 提交**

```bash
git add shared/src/utils/validation.ts shared/__tests__/utils/validation.test.ts
git commit -m "feat(shared): add validation utilities

- Add isValidWebDAVUrl for URL validation
- Add isValidEmail for email validation
- Add isValidDataPath for path validation
- Include comprehensive unit tests"
```

---

## Task 7: 导出所有工具函数

**Files:**
- Create: `shared/src/utils/index.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: 创建 utils/index.ts**

```typescript
export * from './dateFormat';
export * from './fileUtils';
export * from './validation';
```

- [ ] **Step 2: 更新 src/index.ts**

```typescript
// Shared types and utilities for Thesis Tracker
// This file will export all shared modules

export * from './types';
export * from './utils';
```

- [ ] **Step 3: 验证导出**

Run: `cd shared && npx tsc --noEmit`

Expected: 无类型错误

- [ ] **Step 4: 运行所有测试**

Run: `cd shared && npm test`

Expected: 所有测试通过，覆盖率 > 80%

- [ ] **Step 5: 查看测试覆盖率**

Run: `cd shared && npm run test:coverage`

Expected: 显示覆盖率报告，所有文件覆盖率 > 80%

- [ ] **Step 6: 提交**

```bash
git add shared/src/utils/index.ts shared/src/index.ts
git commit -m "feat(shared): export all utilities

- Create utils barrel export
- Update main index to export utils
- All tests passing with >80% coverage"
```

---

## Task 8: 验证 Monorepo 集成

**Files:**
- None (验证任务)

- [ ] **Step 1: 从根目录安装所有依赖**

Run: `npm install`

Expected: 成功安装所有 workspace 的依赖

- [ ] **Step 2: 运行所有测试**

Run: `npm test`

Expected: shared 包的所有测试通过

- [ ] **Step 3: 验证桌面端仍然可以运行**

Run: `npm run dev:desktop`

Expected: 桌面端应用正常启动（按 Ctrl+C 停止）

- [ ] **Step 4: 验证 shared 包可以被引用**

创建临时测试文件 `test-import.js`：

```javascript
const shared = require('./shared/src/index.ts');
console.log('Shared exports:', Object.keys(shared));
```

Run: `node -r ts-node/register test-import.js`

Expected: 显示导出的类型和函数

Run: `rm test-import.js`

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "chore: verify monorepo integration

- All workspace dependencies installed
- Shared package tests passing
- Desktop app still functional
- Ready for mobile app development"
```

---

## 验收标准

完成本阶段后，应满足以下条件：

- [ ] Monorepo 结构已搭建，npm workspaces 配置正确
- [ ] shared 包已创建，包含完整的类型定义和工具函数
- [ ] 所有工具函数都有单元测试，覆盖率 > 80%
- [ ] TypeScript 配置正确，无类型错误
- [ ] 桌面端应用不受影响，仍可正常运行
- [ ] Git 提交历史清晰，每个功能独立提交

## 下一步

完成本阶段后，可以继续：
- **阶段 2**：初始化 React Native 移动端项目
- **阶段 3**：实现移动端核心功能（登录、列表、详情）
- **阶段 4**：实现文件下载和预览功能

---

## 故障排查

### 问题：npm install 失败

**解决方案：**
1. 检查 Node.js 版本（需要 18+）
2. 清除缓存：`npm cache clean --force`
3. 删除 node_modules 和 package-lock.json，重新安装

### 问题：TypeScript 编译错误

**解决方案：**
1. 检查 tsconfig.json 配置
2. 确保所有依赖已安装
3. 运行 `npx tsc --noEmit` 查看详细错误

### 问题：Jest 测试失败

**解决方案：**
1. 检查 jest.config.js 配置
2. 确保 ts-jest 已安装
3. 运行 `npm test -- --verbose` 查看详细错误
