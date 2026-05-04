# 版本号自动填充与数据路径迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现版本号自动填充（日期格式）、修改内容和当前重点改为选填、数据路径切换时自动迁移文件

**Architecture:** 前端在 UploadModal 中生成日期格式版本号，类型系统将 changes/focus 改为可选；后端在 data-dir-config 中添加文件迁移逻辑，在路径切换时自动复制数据文件

**Tech Stack:** TypeScript, React, Electron, Node.js fs module, Vitest

---

## 文件结构

**功能 1：版本号自动填充 + 选填字段**
- `src/renderer/types.ts` - 修改 Version 接口，changes/focus 改为可选
- `src/main/ipc-handlers.ts` - 修改 Version 接口，changes/focus 改为可选
- `src/renderer/components/UploadModal.tsx` - 添加版本号生成逻辑，修改验证
- `src/renderer/components/EditVersionModal.tsx` - 修改验证逻辑，支持可选字段
- `src/renderer/App.tsx` - 传递 versions prop 给 UploadModal

**功能 2：数据路径迁移**
- `src/main/data-dir-config.ts` - 添加迁移函数，修改 setCustomDataDir
- `tests/main/data-dir-config.test.ts` - 添加迁移测试

---

## Task 1: 修改类型定义 - changes 和 focus 改为可选

**Files:**
- Modify: `src/renderer/types.ts:9-19`
- Modify: `src/main/ipc-handlers.ts:33-43`

- [ ] **Step 1: 修改 renderer 端 Version 接口**

在 `src/renderer/types.ts` 中，将 `changes` 和 `focus` 改为可选：

```typescript
export interface Version {
  id: string
  thesisId: string
  version: string
  date: string
  changes?: string  // 改为可选
  focus?: string    // 改为可选
  filePath: string
  fileName: string
  fileType: string
}
```

- [ ] **Step 2: 修改 main 端 Version 接口**

在 `src/main/ipc-handlers.ts` 中，将 `changes` 和 `focus` 改为可选：

```typescript
export interface Version {
  id: string
  thesisId: string
  version: string
  date: string
  changes?: string  // 改为可选
  focus?: string    // 改为可选
  filePath?: string
  fileName?: string
  fileType?: string
}
```

- [ ] **Step 3: 验证类型修改**

运行 TypeScript 编译检查：

```bash
cd /Volumes/YC/AI产品/论文管理/Thesis-Progress-Tracker
npm run build
```

预期：编译成功，无类型错误

- [ ] **Step 4: 提交类型修改**

```bash
git add src/renderer/types.ts src/main/ipc-handlers.ts
git commit -m "refactor: make Version.changes and Version.focus optional"
```

---

## Task 2: 实现版本号自动生成逻辑

**Files:**
- Modify: `src/renderer/components/UploadModal.tsx:1-194`

- [ ] **Step 1: 添加版本号生成函数**

在 `UploadModal.tsx` 文件顶部（import 之后，组件定义之前）添加：

```typescript
function generateNextVersion(existingVersions: Version[]): string {
  const today = new Date()
  const datePrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  // 筛选出今天的版本
  const todayVersions = existingVersions.filter(v => v.version.startsWith(datePrefix))
  
  // 提取序号并找到最大值
  let maxSuffix = 0
  todayVersions.forEach(v => {
    const match = v.version.match(/-(\d+)$/)
    if (match) {
      const suffix = parseInt(match[1], 10)
      if (suffix > maxSuffix) {
        maxSuffix = suffix
      }
    }
  })
  
  return `${datePrefix}-${maxSuffix + 1}`
}
```

- [ ] **Step 2: 修改 UploadModalProps 接口**

在 `UploadModal.tsx` 中修改 props 接口（第 5-8 行）：

```typescript
interface UploadModalProps {
  versions: Version[]  // 新增
  onClose: () => void
  onSubmit: (version: Omit<Version, 'thesisId'>) => void
}
```

- [ ] **Step 3: 修改组件参数和初始化**

修改组件定义（第 10 行）和 useState 初始化（第 11 行）：

```typescript
function UploadModal({ versions, onClose, onSubmit }: UploadModalProps) {
  const [version, setVersion] = useState(() => generateNextVersion(versions))
  const [changes, setChanges] = useState('')
  const [focus, setFocus] = useState('')
  // ... 其他 state 保持不变
```

- [ ] **Step 4: 修改表单验证逻辑**

修改 `handleSubmit` 函数中的验证（第 52-56 行）：

```typescript
const handleSubmit = async () => {
  if (!version || !selectedFile) {
    alert('请填写版本号并选择文件')
    return
  }
  
  // ... 其余代码保持不变
```

- [ ] **Step 5: 更新 UI label**

修改"修改内容"和"当前重点"的 label（第 148 和 160 行）：

```typescript
// 修改内容 label
<label className="text-text font-bold text-xs">修改内容（选填）</label>

// 当前重点 label
<label className="text-text font-bold text-xs">当前重点（选填）</label>
```

- [ ] **Step 6: 验证编译**

```bash
npm run build
```

预期：编译成功

- [ ] **Step 7: 提交 UploadModal 修改**

```bash
git add src/renderer/components/UploadModal.tsx
git commit -m "feat: auto-fill version number with date format and make changes/focus optional"
```

---

## Task 3: 修改 EditVersionModal 验证逻辑

**Files:**
- Modify: `src/renderer/components/EditVersionModal.tsx:66-78`

- [ ] **Step 1: 修改 EditVersionModal 的 onSubmit 类型**

修改 `EditVersionModalProps` 接口（第 8-13 行）：

```typescript
onSubmit: (versionInfo: {
  version: string
  changes?: string  // 改为可选
  focus?: string    // 改为可选
  replacementFilePath?: string
}) => void
```

- [ ] **Step 2: 修改验证逻辑**

修改 `handleSubmit` 函数（第 66-78 行）：

```typescript
const handleSubmit = () => {
  if (!version) {
    alert('请填写版本号')
    return
  }

  onSubmit({
    version,
    changes: changes || undefined,
    focus: focus || undefined,
    replacementFilePath: replacementFile || undefined,
  })
}
```

- [ ] **Step 3: 更新 UI label**

在 EditVersionModal 中找到"修改内容"和"当前重点"的 label，添加"（选填）"：

```typescript
<label className="text-text font-bold text-xs">修改内容（选填）</label>
// ...
<label className="text-text font-bold text-xs">当前重点（选填）</label>
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

预期：编译成功

- [ ] **Step 5: 提交 EditVersionModal 修改**

```bash
git add src/renderer/components/EditVersionModal.tsx
git commit -m "feat: make changes/focus optional in EditVersionModal"
```

---

## Task 4: 在 App.tsx 中传递 versions prop

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: 找到 UploadModal 渲染位置**

在 `App.tsx` 中搜索 `<UploadModal`，找到渲染该组件的位置

- [ ] **Step 2: 添加 versions prop**

修改 UploadModal 的渲染，添加 `versions={versions}` prop：

```typescript
{showUploadModal && (
  <UploadModal
    versions={versions}
    onClose={() => setShowUploadModal(false)}
    onSubmit={handleAddVersion}
  />
)}
```

- [ ] **Step 3: 验证编译**

```bash
npm run build
```

预期：编译成功

- [ ] **Step 4: 提交 App.tsx 修改**

```bash
git add src/renderer/App.tsx
git commit -m "feat: pass versions prop to UploadModal"
```

---

## Task 5: 实现数据迁移函数

**Files:**
- Modify: `src/main/data-dir-config.ts`

- [ ] **Step 1: 添加 copyDirRecursive 辅助函数**

在 `data-dir-config.ts` 文件末尾添加递归复制目录函数：

```typescript
/**
 * 递归复制目录
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      // 只在目标文件不存在时复制
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}
```

- [ ] **Step 2: 添加 migrateDataFiles 函数**

在 `copyDirRecursive` 之前添加主迁移函数：

```typescript
/**
 * 迁移数据文件从旧路径到新路径
 * @param oldPath 旧数据目录路径
 * @param newPath 新数据目录路径
 * @returns 迁移是否成功
 */
export function migrateDataFiles(oldPath: string, newPath: string): boolean {
  try {
    // 如果旧路径和新路径相同，无需迁移
    if (path.resolve(oldPath) === path.resolve(newPath)) {
      return true
    }

    // 如果旧路径不存在，无需迁移
    if (!fs.existsSync(oldPath)) {
      return true
    }

    let migratedCount = 0

    // 1. 迁移 data.json
    const oldDataFile = path.join(oldPath, 'data.json')
    const newDataFile = path.join(newPath, 'data.json')
    if (fs.existsSync(oldDataFile) && !fs.existsSync(newDataFile)) {
      fs.copyFileSync(oldDataFile, newDataFile)
      migratedCount++
    }

    // 2. 迁移 files/ 目录
    const oldFilesDir = path.join(oldPath, 'files')
    const newFilesDir = path.join(newPath, 'files')
    if (fs.existsSync(oldFilesDir)) {
      copyDirRecursive(oldFilesDir, newFilesDir)
      migratedCount++
    }

    // 3. 迁移编辑会话文件（如果存在）
    const sessionFiles = ['edit-session.json', 'edit-session-lock']
    sessionFiles.forEach(fileName => {
      const oldFile = path.join(oldPath, fileName)
      const newFile = path.join(newPath, fileName)
      if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
        fs.copyFileSync(oldFile, newFile)
        migratedCount++
      }
    })

    console.log(`Data migration completed: ${migratedCount} items migrated from ${oldPath} to ${newPath}`)
    return true
  } catch (error) {
    console.error('Data migration failed:', error)
    return false
  }
}
```

- [ ] **Step 3: 修改 setCustomDataDir 函数**

修改 `setCustomDataDir` 函数（第 100-108 行）以集成迁移逻辑：

```typescript
export function setCustomDataDir(input: RuntimeResolutionInput, selectedDir: string): DataDirStatus {
  const normalized = path.resolve(selectedDir)
  if (!ensureWritableDir(normalized)) {
    throw new Error('Selected directory is not writable')
  }

  // 获取当前有效路径（迁移前）
  const oldStatus = resolveRuntimeDataDirStatus(input)
  const oldPath = oldStatus.effectivePath

  // 写入新配置
  writeConfig(input.configFilePath, { customDir: normalized })
  const newStatus = resolveRuntimeDataDirStatus(input)

  // 执行数据迁移
  migrateDataFiles(oldPath, newStatus.effectivePath)

  return newStatus
}
```

- [ ] **Step 4: 验证编译**

```bash
npm run build
```

预期：编译成功

- [ ] **Step 5: 提交数据迁移实现**

```bash
git add src/main/data-dir-config.ts
git commit -m "feat: auto-migrate data files when changing storage path"
```

---

## Task 6: 为数据迁移添加测试

**Files:**
- Modify: `tests/main/data-dir-config.test.ts`

- [ ] **Step 1: 添加测试导入**

在 `data-dir-config.test.ts` 顶部添加导入：

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { resolveDataDirStatus, migrateDataFiles } from '../../src/main/data-dir-config'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
```

- [ ] **Step 2: 添加迁移测试套件**

在文件末尾添加新的测试套件：

```typescript
describe('migrateDataFiles', () => {
  let tempDir: string
  let oldPath: string
  let newPath: string

  beforeEach(() => {
    // 创建临时测试目录
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'thesis-test-'))
    oldPath = path.join(tempDir, 'old')
    newPath = path.join(tempDir, 'new')
    fs.mkdirSync(oldPath, { recursive: true })
    fs.mkdirSync(newPath, { recursive: true })
  })

  afterEach(() => {
    // 清理测试目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('migrates data.json when it exists', () => {
    // 创建测试数据
    const testData = { theses: [], versions: [] }
    fs.writeFileSync(path.join(oldPath, 'data.json'), JSON.stringify(testData))

    // 执行迁移
    const result = migrateDataFiles(oldPath, newPath)

    // 验证
    expect(result).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'data.json'))).toBe(true)
    const migratedData = JSON.parse(fs.readFileSync(path.join(newPath, 'data.json'), 'utf-8'))
    expect(migratedData).toEqual(testData)
  })

  it('migrates files directory recursively', () => {
    // 创建测试文件结构
    const filesDir = path.join(oldPath, 'files', 'thesis_123')
    fs.mkdirSync(filesDir, { recursive: true })
    fs.writeFileSync(path.join(filesDir, 'version_1.pdf'), 'test content')

    // 执行迁移
    const result = migrateDataFiles(oldPath, newPath)

    // 验证
    expect(result).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'files', 'thesis_123', 'version_1.pdf'))).toBe(true)
    const content = fs.readFileSync(path.join(newPath, 'files', 'thesis_123', 'version_1.pdf'), 'utf-8')
    expect(content).toBe('test content')
  })

  it('does not overwrite existing files in new path', () => {
    // 在新旧路径都创建 data.json，内容不同
    fs.writeFileSync(path.join(oldPath, 'data.json'), JSON.stringify({ old: true }))
    fs.writeFileSync(path.join(newPath, 'data.json'), JSON.stringify({ new: true }))

    // 执行迁移
    const result = migrateDataFiles(oldPath, newPath)

    // 验证新路径的文件未被覆盖
    expect(result).toBe(true)
    const data = JSON.parse(fs.readFileSync(path.join(newPath, 'data.json'), 'utf-8'))
    expect(data).toEqual({ new: true })
  })

  it('returns true when old path does not exist', () => {
    const nonExistentPath = path.join(tempDir, 'nonexistent')
    const result = migrateDataFiles(nonExistentPath, newPath)
    expect(result).toBe(true)
  })

  it('returns true when old and new paths are the same', () => {
    const result = migrateDataFiles(oldPath, oldPath)
    expect(result).toBe(true)
  })

  it('migrates edit session files when they exist', () => {
    // 创建编辑会话文件
    fs.writeFileSync(path.join(oldPath, 'edit-session.json'), '{}')
    fs.writeFileSync(path.join(oldPath, 'edit-session-lock'), '')

    // 执行迁移
    const result = migrateDataFiles(oldPath, newPath)

    // 验证
    expect(result).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'edit-session.json'))).toBe(true)
    expect(fs.existsSync(path.join(newPath, 'edit-session-lock'))).toBe(true)
  })
})
```

- [ ] **Step 3: 运行测试**

```bash
npm test -- tests/main/data-dir-config.test.ts
```

预期：所有测试通过

- [ ] **Step 4: 提交测试**

```bash
git add tests/main/data-dir-config.test.ts
git commit -m "test: add tests for data migration functionality"
```

---

## Task 7: 手动测试和验证

**Files:**
- N/A (手动测试)

- [ ] **Step 1: 启动应用**

```bash
npm run dev
```

- [ ] **Step 2: 测试版本号自动填充**

1. 打开应用，选择一个论文
2. 点击"上传新版本"
3. 验证版本号字段自动填充为 `YYYY-MM-DD-1` 格式
4. 不填写"修改内容"和"当前重点"，只选择文件
5. 点击提交，验证可以成功创建版本

- [ ] **Step 3: 测试版本号递增**

1. 再次点击"上传新版本"
2. 验证版本号自动填充为 `YYYY-MM-DD-2`（序号递增）
3. 手动修改版本号为自定义值（如 `v1.0`）
4. 提交，验证可以保存自定义版本号

- [ ] **Step 4: 测试数据路径迁移**

1. 创建几个论文和版本
2. 打开设置，选择新的数据存储路径
3. 切换路径后，验证新路径中存在 `data.json` 和 `files/` 目录
4. 验证所有版本文件都已复制到新路径
5. 验证应用仍然正常显示所有论文和版本

- [ ] **Step 5: 测试 EditVersionModal**

1. 选择一个已有版本，点击"从此版本编辑"
2. 在弹出的 EditVersionModal 中，不填写"修改内容"和"当前重点"
3. 提交，验证可以成功创建编辑会话

- [ ] **Step 6: 记录测试结果**

如果发现任何问题，记录下来并修复。所有测试通过后继续下一步。

- [ ] **Step 7: 最终提交**

```bash
git add -A
git commit -m "chore: manual testing completed for version autofill and data migration"
```

---

## 完成检查清单

- [ ] 所有类型定义已更新（changes/focus 可选）
- [ ] UploadModal 实现版本号自动生成
- [ ] UploadModal 和 EditVersionModal 验证逻辑已更新
- [ ] App.tsx 传递 versions prop
- [ ] 数据迁移函数已实现
- [ ] 数据迁移测试已添加并通过
- [ ] 手动测试所有功能正常
- [ ] 所有修改已提交到 git

---

## 注意事项

1. **类型安全**：修改类型后，确保所有使用 `changes` 和 `focus` 的地方都能正确处理 `undefined` 值
2. **版本号格式**：自动生成的版本号格式为 `YYYY-MM-DD-N`，但用户可以手动修改为任意格式
3. **迁移策略**：采用复制而非移动，保留旧路径文件，避免数据丢失
4. **错误处理**：迁移失败不影响路径切换，应用仍使用新路径
5. **测试覆盖**：确保测试覆盖所有边界情况（空版本列表、路径相同、文件已存在等）
