---
name: 版本号自动填充与数据路径迁移
description: 实现版本号自动填充（日期格式）、修改内容和当前重点改为选填、数据路径切换时自动迁移文件
type: feature
---

# 版本号自动填充与数据路径迁移设计文档

## 概述

本设计包含两个独立但相关的功能优化：

1. **版本号自动填充**：创建新版本时自动填充日期格式的版本号，允许用户修改
2. **选填字段优化**：将"修改内容"和"当前重点"从必填改为选填
3. **数据路径迁移**：切换数据存储路径时自动迁移所有版本文件

## 功能 1：版本号自动填充 + 选填字段优化

### 需求

- 创建新版本时，版本号字段自动填充为日期格式：`YYYY-MM-DD-N`
- 同一天创建多个版本时，序号 N 自动递增（如 `2026-04-09-1`、`2026-04-09-2`）
- 用户可以手动修改自动填充的版本号
- "修改内容"和"当前重点"字段改为选填，不再强制要求

### 设计方案

#### 版本号生成逻辑

在 `UploadModal` 组件中实现版本号自动生成：

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

#### 涉及文件修改

**1. `src/renderer/components/UploadModal.tsx`**

- 新增 prop：`versions: Version[]`（从父组件传入当前论文的所有版本）
- 在组件初始化时调用 `generateNextVersion` 生成默认版本号
- 使用 `useState` 初始化版本号字段为生成的值
- 修改 `handleSubmit` 验证逻辑：
  ```typescript
  // 修改前
  if (!version || !changes || !focus || !selectedFile) {
    alert('请填写所有必填项')
    return
  }
  
  // 修改后
  if (!version || !selectedFile) {
    alert('请填写版本号并选择文件')
    return
  }
  ```
- 更新 UI label：
  - "修改内容" → "修改内容（选填）"
  - "当前重点" → "当前重点（选填）"

**2. `src/renderer/types.ts`**

修改 `Version` 接口，将 `changes` 和 `focus` 改为可选：

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

**3. `src/main/ipc-handlers.ts`**

修改 `Version` 接口定义（与 renderer 保持一致）：

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

`add-version` handler 无需修改，因为它直接使用传入的 `versionData`，可选字段会自动处理。

**4. `src/renderer/App.tsx`**

在渲染 `UploadModal` 时传入 `versions` prop：

```typescript
{showUploadModal && (
  <UploadModal
    versions={versions}  // 新增
    onClose={() => setShowUploadModal(false)}
    onSubmit={handleAddVersion}
  />
)}
```

**5. `src/renderer/components/EditVersionModal.tsx`（如果存在）**

同步类型变更，确保 `changes` 和 `focus` 作为可选字段处理。

### 边界情况处理

- 如果当前论文没有任何版本，生成 `YYYY-MM-DD-1`
- 如果用户手动修改版本号为非日期格式，允许保存（不强制格式）
- 如果用户清空了自动填充的版本号，提交时仍然提示"请填写版本号"

## 功能 2：数据路径切换时自动迁移文件

### 需求

用户通过设置界面更改数据存储路径时，自动将旧路径中的所有数据文件迁移到新路径。

### 设计方案

#### 迁移内容

需要迁移的文件和目录：

1. `data.json` - 主数据文件（包含所有论文和版本的元数据）
2. `files/` - 所有论文文件目录
   - `files/thesis_<id>/` - 每个论文的文件子目录
   - `files/thesis_<id>/version_<id>.<ext>` - 版本文件
3. 编辑会话相关文件（如果存在）

#### 迁移策略

- **复制而非移动**：保留旧路径的文件，避免意外数据丢失
- **不覆盖已存在文件**：如果新路径已有同名文件，跳过该文件
- **容错处理**：迁移失败不回滚配置，记录错误日志供用户排查

#### 涉及文件修改

**1. `src/main/data-dir-config.ts`**

新增迁移函数：

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
      // 递归复制整个 files 目录
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

修改 `setCustomDataDir` 函数：

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

**2. `src/main/ipc-handlers.ts`**

无需修改，`select-data-dir` handler 调用的 `setCustomDataDir` 已包含迁移逻辑。

### 用户体验

- 路径切换时迁移自动进行，无需用户干预
- 迁移过程在后台完成，不阻塞 UI
- 如果迁移失败，应用仍然使用新路径，用户可以手动复制文件或重新选择路径

### 边界情况处理

- 新旧路径相同：跳过迁移
- 旧路径不存在：跳过迁移（首次设置路径的情况）
- 新路径已有文件：不覆盖，保留新路径的文件
- 迁移过程出错：记录日志，不影响路径切换

## 测试要点

### 版本号自动填充

1. 创建第一个版本，验证版本号为 `YYYY-MM-DD-1`
2. 同一天创建第二个版本，验证版本号为 `YYYY-MM-DD-2`
3. 手动修改版本号后提交，验证可以保存自定义版本号
4. 清空版本号提交，验证提示错误
5. 清空"修改内容"和"当前重点"提交，验证可以成功保存

### 数据路径迁移

1. 创建几个论文和版本，然后切换数据路径，验证所有文件都被复制到新路径
2. 在新路径已有 `data.json` 的情况下切换路径，验证不覆盖已有文件
3. 切换到与当前路径相同的路径，验证不执行迁移
4. 首次设置数据路径（旧路径不存在），验证不报错

## 实施顺序

1. 实现版本号自动填充逻辑
2. 修改类型定义（changes/focus 可选）
3. 更新 UploadModal UI 和验证逻辑
4. 实现数据迁移函数
5. 集成迁移到路径切换流程
6. 测试所有场景

## 风险与注意事项

- **类型变更影响**：`changes` 和 `focus` 改为可选后，需要检查所有使用这些字段的地方，确保能正确处理 `undefined` 值
- **迁移性能**：如果文件很大，迁移可能耗时较长，但由于是复制操作，不会丢失数据
- **磁盘空间**：迁移采用复制而非移动，会占用双倍磁盘空间，用户需要手动清理旧路径
