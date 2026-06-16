# 参考文献文件 AI 导入设计文档

> 日期：2026-06-16
> 状态：已确认

## 概述

参考文献管理从“手动填写标题、作者、年份”升级为“上传参考文献文件并自动识别”。用户在每篇论文的参考文献区域上传 PDF、DOCX 或 DOC 文件，应用把原始文件保存到该论文在坚果云同步的数据目录中，然后从文件中提取可复制文本，调用 DeepSeek 将文本结构化为参考文献条目。识别结果先进入确认/编辑页，用户确认后再写入该论文的参考文献数据。

## 目标

- 每篇论文可以上传参考文献原始文件。
- 原始文件保存在论文目录下，并随坚果云同步。
- 支持可复制文字的 PDF、DOCX、DOC 文件。
- 使用 DeepSeek API 将提取文本识别为标题、作者、年份。
- 识别结果必须先经过确认/编辑，再保存。
- DeepSeek API key 只保存在本机设置中，不同步到坚果云。
- 参考文献仍然只在折叠区管理，不进入主时间线。

## 非目标

- 第一版不做扫描版 PDF OCR。
- 第一版不做 DOI 自动补全。
- 第一版不做 BibTeX、RIS、EndNote 导入。
- 第一版不做多文件批量上传。
- 第一版不做云端密钥同步。
- 第一版不直接把原始 PDF/DOCX/DOC 文件上传给 DeepSeek。

## 当前项目上下文

- 桌面端是 Electron + React + TypeScript。
- 每篇论文目录下已有 `versions.json` 和 `references.json`。
- 当前参考文献 UI 是 `src/renderer/components/ReferenceSection.tsx` 和 `ReferenceModal.tsx`。
- 参考文献 IPC 已有 `get-references`、`add-reference`、`delete-reference`。
- 文件选择和复制已有 `select-file`、`copy-file` 等 IPC 可参考。
- 多设备同步依赖坚果云同步本地数据目录，因此原始参考文献文件需要写入论文目录。

## 方案选择

### 方案 1：本地提取文本 + DeepSeek 结构化识别

应用先从 PDF、DOCX、DOC 文件中提取文本，再把文本片段发送给 DeepSeek，要求返回严格 JSON。应用解析 JSON 后显示确认页。

优点：稳定、成本可控、可测试；不依赖 DeepSeek 是否支持文件直传；原文件仍保存在坚果云目录。

缺点：扫描版 PDF 暂时无法识别；需要引入本地文本提取能力。

### 方案 2：尝试文件直传给 AI

用户上传文件后，应用直接把文件交给 AI 服务识别。

优点：交互概念最简单。

缺点：DeepSeek API 不是以 PDF/Word 文件直传为核心能力；容易遇到文件大小、格式支持和接口限制；失败时难以定位原因。

### 方案 3：纯本地规则识别

应用只靠本地正则和参考文献格式规则拆分条目。

优点：不需要 API key，不走网络。

缺点：中英文混排、不同引用风格、换行和作者格式差异很容易导致识别不准。

### 最终决定

采用方案 1。应用本地负责文件保存和文本提取，DeepSeek 只负责从文本中识别结构化参考文献。这样既符合“上传文件自动识别”，又避免把文件直传能力建立在不稳定假设上。

## 数据设计

每篇论文目录继续使用 `references.json`，结构扩展为同时保存文件和条目。

```json
{
  "referenceFiles": [
    {
      "id": "file_uuid",
      "thesisId": "thesis_uuid",
      "originalName": "references.pdf",
      "fileName": "reference_file_uuid.pdf",
      "filePath": "references/reference_file_uuid.pdf",
      "mimeType": "application/pdf",
      "status": "ready",
      "uploadedAt": "2026-06-16T00:00:00.000Z",
      "recognizedAt": "2026-06-16T00:01:00.000Z",
      "error": null
    }
  ],
  "references": [
    {
      "id": "reference_uuid",
      "thesisId": "thesis_uuid",
      "sourceFileId": "file_uuid",
      "title": "论文标题",
      "authors": "作者",
      "year": "2026",
      "createdAt": "2026-06-16T00:01:30.000Z"
    }
  ]
}
```

文件存储位置：

```text
<数据目录>/<论文目录>/references/
  reference_<fileId>.pdf
  reference_<fileId>.docx
  reference_<fileId>.doc
```

文件状态：

| 状态 | 含义 |
| --- | --- |
| `pending` | 文件已保存，等待提取/识别 |
| `recognizing` | 正在提取文本或调用 DeepSeek |
| `ready` | 已识别并保存条目 |
| `failed` | 识别失败，原文件仍保留 |

DeepSeek API key 不写入 `references.json`，也不写入论文目录。它保存在本机设置中，例如 Electron `userData` 下的本地配置文件。

## 上传和识别流程

```text
ReferenceSection
  -> 选择 PDF/DOCX/DOC
  -> main process 复制原文件到 <论文目录>/references/
  -> references.json 记录 referenceFiles[pending]
  -> 本地提取可复制文本
  -> 如果缺少 DeepSeek API key，提示用户输入并保存到本机
  -> 调用 DeepSeek 获取 JSON 识别结果
  -> 前端打开识别结果确认页
  -> 用户编辑/删除条目
  -> 用户确认
  -> references.json 写入 references，并更新 referenceFiles 状态为 ready
```

如果文件保存成功但识别失败，`referenceFiles` 保留该文件并标记为 `failed`。用户可以重新识别或删除该文件。

## UI 设计

参考文献区域仍默认折叠。展开后显示：

- `上传参考文献文件` 按钮。
- 已上传文件列表：文件名、上传时间、识别状态。
- 识别出来的参考文献条目列表：标题、作者、年份、来源文件。

上传后显示识别进度。识别完成后打开确认页。

确认页包含：

- 来源文件名。
- 可编辑的识别结果表格。
- 每条结果可修改标题、作者、年份。
- 每条结果可删除。
- 确认保存按钮。
- 取消按钮。取消时原文件仍保留，但不写入条目；文件状态可保持 `failed` 或 `pending`，便于重新识别。

删除来源文件时需要确认。如果该文件已经生成参考文献条目，确认文案应说明可以一并删除由它识别出的条目。

## DeepSeek 识别设计

DeepSeek 不直接接收原始 PDF/Word 文件。应用先提取文本，并优先截取参考文献段落。如果无法定位参考文献段落，则使用文末文本片段作为候选输入。

调用 DeepSeek 时要求返回严格 JSON：

```json
{
  "references": [
    {
      "title": "string",
      "authors": "string",
      "year": "string"
    }
  ]
}
```

解析规则：

- 只接受 `references` 数组。
- 标题、作者、年份任一缺失的条目不直接保存。
- 年份优先接受四位年份；无法判断时留空并在确认页提示用户补齐。
- DeepSeek 返回非 JSON 或 JSON 结构不符合要求时，标记识别失败并允许重试。

## 错误处理

- 没有 DeepSeek API key：提示填写并保存到本机。
- 文件无法复制：不创建 `referenceFiles` 记录，提示上传失败。
- 文件无可提取文字：保存原文件，状态标记为 `failed`，错误为“未识别到可提取文字”。
- DeepSeek 网络/API 失败：保存原文件，状态标记为 `failed`，允许重试。
- DeepSeek 返回格式不对：保存原文件，状态标记为 `failed`，允许重试。
- 用户快速切换论文：识别结果必须绑定上传时的 thesisId，不能写入当前新选中的论文。

## 测试设计

- `references.json` 能保存并读取 `referenceFiles` 和 `references`。
- 上传参考文献文件会复制到当前论文目录的 `references/` 文件夹。
- DeepSeek API key 只写入本机设置，不进入坚果云数据目录。
- PDF、DOCX、DOC 文件类型能进入上传流程。
- AI 返回 JSON 会被校验，非法结果不会直接保存。
- 识别失败时原文件仍保留，文件状态更新为 `failed`。
- 删除来源文件时，只删除对应文件和对应来源条目，不影响其他论文。
- 快速切换论文时，A 论文的识别结果不会写到 B 论文。

## 发布注意事项

这次功能会新增网络 API 调用和本地密钥保存。发布前需要验证：

- 没有 API key 时的提示路径。
- API key 保存后重启仍可使用。
- 识别失败不会造成文件或数据丢失。
- 坚果云目录中能看到上传的原始参考文献文件。
