# 参考文献折叠区设计文档

> 日期：2026-06-16
> 状态：已确认

## 概述

为每篇论文增加一个轻量的参考文献管理区。该区域位于当前论文的时间线页面内，默认折叠，只显示入口和数量；展开后支持新增和删除参考文献。参考文献不出现在主时间线或论文列表中，避免干扰版本管理主流程。

## 目标

- 每篇论文拥有自己的参考文献清单。
- 主页面默认不展示参考文献详情，只保留一个小型折叠入口。
- 每条参考文献只保存标题、作者、年份。
- 支持随时新增和删除参考文献。
- 参考文献数据独立于版本数据，不影响现有论文版本时间线。

## 非目标

- 本次不做引用格式导出。
- 本次不做参考文献编辑功能。
- 本次不做 DOI、链接、期刊、备注等扩展字段。
- 本次不把参考文献接入移动端展示。
- 本次不在论文列表或版本卡片中显示参考文献条目。

## 当前项目上下文

- 桌面端是 Electron + React + TypeScript。
- 渲染层的主入口是 `src/renderer/App.tsx`。
- 当前论文的版本时间线由 `src/renderer/components/Timeline.tsx` 展示。
- 论文元数据存储在 `theses-index.json`。
- 每篇论文的版本记录存储在该论文目录下的 `versions.json`。
- 主进程数据读写集中在 `src/main/split-data-store.ts` 和 `src/main/ipc-handlers.ts`。
- 预加载桥接集中在 `src/preload/preload.ts`。

## 方案选择

### 方案 1：时间线页顶部的折叠参考文献区

在当前论文时间线标题附近增加一个折叠入口，默认只显示“参考文献 n”。点击后展开列表和新增入口。

优点：最符合“默认不占版面、点进去再展开”的需求，和当前论文上下文绑定清晰。

缺点：时间线组件会多接收一组参考文献相关 props。

### 方案 2：右侧抽屉或弹窗管理参考文献

主页面只放一个按钮，点击后打开抽屉或弹窗管理参考文献。

优点：主页面最干净。

缺点：增删操作多一步，轻量信息被做成了较重交互。

### 方案 3：放在左侧栏论文信息区

在侧边栏当前论文信息附近增加折叠分组。

优点：和论文列表距离近。

缺点：侧边栏空间有限，容易和上传、设置、同步状态等信息争抢注意力。

### 最终决定

采用方案 1。参考文献属于当前论文的辅助信息，应贴近论文时间线，但默认折叠，不进入时间线主体列表。

## UI 设计

### 折叠入口

折叠入口放在时间线标题下方、编辑状态栏附近。默认状态只显示一行：

```text
参考文献 3        [展开图标]
```

当没有参考文献时显示：

```text
参考文献 0        [展开图标]
```

入口高度保持较小，视觉上低于论文标题和编辑状态栏。

### 展开状态

展开后显示：

- 参考文献列表。
- 新增参考文献按钮。
- 空状态文案和新增入口。

每条参考文献展示：

```text
标题
作者 · 年份                                      [删除]
```

删除使用小型图标按钮或低权重按钮，并保留确认提示，避免误删。

### 新增流程

点击“新增参考文献”后打开小弹窗。表单只包含：

- 标题，必填。
- 作者，必填。
- 年份，必填。

提交成功后关闭弹窗并刷新当前论文的参考文献列表。

### 不做编辑态

本次不支持编辑已有参考文献。若用户填错，可以删除后重新添加。这样交互最简单，也符合当前“随时增删”的需求。

## 数据设计

每篇论文目录下新增 `references.json`，与 `versions.json` 平行。

```json
{
  "references": [
    {
      "id": "uuid",
      "title": "论文标题",
      "authors": "作者",
      "year": "2026",
      "createdAt": "2026-06-16T00:00:00.000Z"
    }
  ]
}
```

TypeScript 结构：

```ts
interface ReferenceRecord {
  id: string
  thesisId: string
  title: string
  authors: string
  year: string
  createdAt: string
}

interface ThesisReferences {
  references: ReferenceRecord[]
}
```

`thesisId` 可保留在记录里，方便前端状态和未来移动端读取；文件仍按当前项目模式落在论文目录下。

## 数据流

切换论文时：

```text
App
  -> loadVersions(currentThesisId)
  -> loadReferences(currentThesisId)
  -> Timeline receives versions and references
```

新增参考文献时：

```text
ReferenceSection
  -> App handler
  -> window.electronAPI.addReference(thesisId, input)
  -> main process writes references.json
  -> App reloads references for current thesis
```

删除参考文献时：

```text
ReferenceSection
  -> App handler
  -> window.electronAPI.deleteReference(thesisId, referenceId)
  -> main process updates references.json
  -> App reloads references for current thesis
```

## 主进程与 IPC

### 数据存储函数

在 `src/main/split-data-store.ts` 增加：

- `loadThesisReferences(dataDir, thesisTitle): ThesisReferences`
- `saveThesisReferences(dataDir, thesisTitle, data): void`

缺失文件返回 `{ references: [] }`。

### IPC 通道

在 `src/main/ipc-handlers.ts` 增加：

| 通道 | 作用 |
|------|------|
| `get-references` | 按论文 ID 读取参考文献 |
| `add-reference` | 给论文新增参考文献 |
| `delete-reference` | 删除论文下的一条参考文献 |

主进程通过论文 ID 查到论文标题，再复用当前论文目录解析逻辑。这样保持和现有版本数据路径一致。

### Preload API

在 `src/preload/preload.ts` 和渲染层类型中增加：

```ts
getReferences: (thesisId: string) => Promise<ReferenceRecord[]>
addReference: (
  thesisId: string,
  input: { title: string; authors: string; year: string }
) => Promise<ReferenceRecord>
deleteReference: (thesisId: string, referenceId: string) => Promise<boolean>
```

## 前端组件设计

### 新增组件：ReferenceSection

建议新增 `src/renderer/components/ReferenceSection.tsx`。

职责：

- 管理展开/收起 UI 状态。
- 展示参考文献数量。
- 展示空状态和参考文献列表。
- 触发新增弹窗。
- 触发删除确认。

组件不直接调用 Electron API，只通过 props 调用 App 传入的 handler。

### 新增组件：ReferenceModal

建议新增 `src/renderer/components/ReferenceModal.tsx`。

职责：

- 收集标题、作者、年份。
- 做最小必填校验。
- 提交给上层 handler。

### App 状态

在 `App.tsx` 增加：

```ts
const [references, setReferences] = useState<ReferenceRecord[]>([])
```

并增加：

- `loadReferences(thesisId)`
- `handleAddReference(input)`
- `handleDeleteReference(referenceId)`

切换论文时同时加载版本和参考文献。删除当前论文时，随着论文目录删除，参考文献文件自然删除。

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| `references.json` 不存在 | 返回空列表 |
| `references.json` 损坏 | 返回空列表并记录日志，前端显示轻提示 |
| 论文 ID 不存在 | IPC 返回空列表或失败结果 |
| 新增字段缺失 | 前端阻止提交，主进程再次校验 |
| 新增写入失败 | 保持原列表，提示新增失败 |
| 删除写入失败 | 保持原列表，提示删除失败 |

参考文献区的失败不影响论文切换、版本时间线、上传版本和编辑会话。

## 测试计划

### 主进程数据测试

在 `tests/main/split-data-store.test.ts` 或独立测试文件中覆盖：

- 缺失 `references.json` 时返回空列表。
- 保存后可以读取参考文献。
- 文件损坏时返回空列表。
- 参考文献文件和版本文件互不影响。

### IPC / Preload 契约测试

在现有契约测试中覆盖：

- `preload.ts` 暴露 `getReferences`。
- `preload.ts` 暴露 `addReference`。
- `preload.ts` 暴露 `deleteReference`。

### 渲染层交互测试

若项目已有合适的 React 组件测试环境，则覆盖：

- 默认折叠状态只显示参考文献数量。
- 展开后显示空状态。
- 展开后显示参考文献列表。
- 点击删除时触发删除 handler。

如果当前渲染层没有组件测试基础，本次可以先用类型检查和构建验证，避免为一个轻量组件引入额外测试框架。

## 验收标准

- 每篇论文页面都有参考文献折叠入口。
- 默认状态不展示参考文献条目。
- 展开后可以看到当前论文的参考文献列表。
- 可以新增标题、作者、年份三字段参考文献。
- 可以删除已有参考文献。
- 切换论文后只显示该论文自己的参考文献。
- 参考文献不会出现在主时间线、论文列表或版本详情中。
- 现有版本上传、删除、编辑流程不受影响。
