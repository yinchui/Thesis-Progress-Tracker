# Mobile App Design

**Date:** 2026-05-04

**Status:** Approved

## Goal

在保留现有 macOS / Windows 桌面版的前提下，为 Thesis Progress Tracker 增加移动版能力，并尽量复用现有 React / TypeScript 代码、业务逻辑、数据模型与设计资产，避免分叉出一套长期独立维护的移动端代码库。

## Current State

- 当前实际代码仓库位于 `Thesis-Progress-Tracker/`。
- 仓库当前是桌面端单仓结构，核心目录包括：
  - `src/main/`：Electron 主进程、文件系统、路径、更新、IPC 等桌面能力。
  - `src/preload/`：预加载桥接。
  - `src/renderer/`：React 渲染层与 UI 组件。
  - `tests/main/` 与 `tests/release/`：桌面端主流程与发布相关测试。
- 当前并不是 mac 版和 Windows 版各维护一套代码，而是一套桌面端代码经过不同平台打包产物支持 macOS 与 Windows。

## Decision Summary

### Recommended Direction

就在现有 `Thesis-Progress-Tracker` 仓库内演进移动版，但不把移动端代码直接堆进现有 Electron 目录，而是将仓库逐步重组为同仓多端结构。

### Chosen Strategy

- 同仓多端，而不是另开独立移动端仓库。
- 桌面端继续保留 Electron。
- 移动端优先采用 `React/Vite + Capacitor`。
- 业务逻辑、类型、数据模型、状态规则和设计 tokens 抽为共享包。
- Electron 专属能力与移动端原生能力分别通过平台适配层实现。

### Why This Direction

- 用户目标是优先复用现有代码，而不是构建一套独立移动产品。
- 当前 renderer 层已经是 React 前端，最适合复用到移动端 WebView / Capacitor 容器。
- 分仓会更早引入逻辑重复、Bug 双修、数据模型漂移和发布节奏失衡的问题。
- 同仓但分 app 的方式既能最大化共享核心能力，又能避免移动端直接依赖 Electron 代码。

## Options Considered

### Option 1: Same Repo Monorepo Structure

在当前仓库内重组为 `apps + packages` 结构，桌面端和移动端各为独立 app，共享逻辑抽到 packages。

**Pros**

- 代码复用率最高。
- 数据模型和业务规则天然保持一致。
- 长期维护成本最低。
- 后续如果增加 Web / PWA 能力也更自然。

**Cons**

- 需要一次结构重组。
- 前期要额外处理构建、路径和测试拆分。

### Option 2: Add a `mobile/` Directory Without Full Extraction

在当前仓库中快速增加移动端目录，但共享边界先不系统整理。

**Pros**

- 启动最快。
- 前期改动表面上较少。

**Cons**

- 很容易演化成桌面复制一份、移动再改一份。
- 共享逻辑会以复制粘贴形式扩散。
- 后续再抽公共层时返工更大。

### Option 3: Separate Mobile Repository

为移动端新开一个仓库，只共享少量接口或数据协议。

**Pros**

- 组织边界最清晰。
- 若团队完全分离，流程上更独立。

**Cons**

- 与“尽量复用现有代码”的目标不一致。
- 数据模型和逻辑同步成本高。
- 初期开发速度和长期维护成本都更差。

## Proposed Repository Architecture

目标结构如下：

```text
Thesis-Progress-Tracker/
  apps/
    desktop/
    mobile/
  packages/
    core/
    data/
    ui-tokens/
  docs/
  tests/
```

### Architecture Notes

- `apps/desktop/` 承接当前 Electron 应用入口、主进程、预加载与桌面发布配置。
- `apps/mobile/` 承接 Capacitor 工程、移动端入口、移动端导航与原生桥接。
- `packages/core/` 承接业务模型、类型、纯逻辑、状态转换、校验规则。
- `packages/data/` 承接数据访问抽象、同步协议、平台无关的数据服务接口。
- `packages/ui-tokens/` 承接主题变量、尺寸、颜色、文案常量等可跨端共享的视觉基础层。

## Shared vs Platform-Specific Boundaries

### Shared Code

以下内容应优先抽取为跨端共享能力：

- TypeScript 类型定义。
- 论文、版本、进度、筛选等数据模型。
- 排序、过滤、统计、进度计算规则。
- 表单校验和状态流转规则。
- 应用层 actions、services 和平台无关 hooks。
- 视觉 tokens、文案常量、图标映射。

### Desktop-Specific Code

以下内容保留在桌面端：

- `src/main/` 相关 Electron 主进程代码。
- `src/preload/` 桥接逻辑。
- 文件监听、本地路径解析、自动更新。
- 与桌面窗口模型强绑定的能力。

### Mobile-Specific Code

以下内容在移动端单独实现：

- 权限请求。
- 前后台生命周期处理。
- 移动端导航。
- 原生文件选择、分享、系统交互。
- 手势与小屏交互适配。

## Recommended Mobile Technology

推荐优先使用 `Capacitor + 现有 React/Vite`。

### Why Not React Native / Expo First

- React Native 能复用业务逻辑，但现有 UI 基本需要重写。
- 当前目标是优先复用现有桌面前端层，因此 React/Vite 延展到移动壳的迁移成本更低。

### Why Not PWA As the Main Target

- PWA 可以作为补充能力，但不适合作为完整移动版主方案。
- 原生能力、上架形态和系统集成体验都弱于 Capacitor App。

## Migration Sequence

迁移顺序应遵循“先抽核心，再接平台”的原则。

### Phase 1: Extract Shared Core

- 从现有桌面代码中抽离类型、数据模型、进度计算、筛选排序、校验与状态规则。
- 这一层不得依赖 Electron 或移动端 API。

### Phase 2: Introduce Platform Adapters

将桌面特有系统能力收敛为接口，例如：

- `StorageAdapter`
- `FilePickerAdapter`
- `UpdateAdapter`
- `LifecycleAdapter`

桌面端和移动端各自提供实现，共享层只依赖接口，不依赖平台细节。

### Phase 3: Reorganize the UI Layer

- 从现有 renderer 层抽取可复用组件、hooks 和页面状态逻辑。
- 不强求移动端完全复用桌面布局。
- 移动端可在共享逻辑基础上重做导航与交互。

### Phase 4: Add the Mobile Shell

- 在共享层和适配层稳定后再接入 Capacitor。
- 让移动端更多承担装配与适配工作，而不是边拆桌面逻辑边并行试错。

## Data Flow

建议统一为如下数据流：

```text
UI (desktop/mobile)
  -> app-level actions and hooks
  -> shared core business logic
  -> platform adapter interfaces
  -> desktop adapters / mobile adapters
```

### Data Flow Principles

- UI 只负责交互与展示。
- 共享核心负责规则、转换和业务约束。
- 平台层负责与本地系统能力交互。
- 两端对同一输入应得到相同的业务结果。

## Error Handling

### Shared Layer Errors

共享层只返回业务错误，例如：

- 数据格式无效
- 状态转换不合法
- 目标记录不存在

### Platform Layer Errors

平台层负责封装并翻译系统错误，例如：

- 没有权限
- 文件不可访问
- 目录不存在
- 插件调用失败

### UI Layer Errors

- UI 不直接暴露底层报错。
- UI 将错误映射为用户可理解的提示。
- 移动端需额外考虑切后台、中断恢复与未保存状态保护。

## Testing Strategy

### Shared Core First

优先把共享层作为测试重心：

- 类型和模型规则测试
- 排序、筛选、进度计算测试
- 状态流转测试
- 数据校验测试

### Adapter Contract Tests

使用统一契约验证 desktop adapter 与 mobile adapter 是否都满足相同行为约束。

### Targeted End-to-End Coverage

桌面端和移动端分别覆盖少量关键路径：

- 打开数据
- 编辑论文
- 保存
- 重启后恢复
- 导入 / 导出

### Testing Priority

优先保证“同样输入，两端业务结果一致”，再考虑界面细节的一致性。

## Risks and Mitigations

### Storage Model Mismatch

**Risk:** 桌面端默认基于文件系统，移动端无法直接沿用。

**Mitigation:** 提前引入存储抽象，不允许共享层直接读写本地路径。

### Shared Layer Pollution

**Risk:** Electron 逻辑渗入共享层，导致移动端难以接入。

**Mitigation:** 为共享层建立明确依赖边界，并通过测试约束平台适配接口。

### Desktop UI Assumptions

**Risk:** 将桌面多栏和高密度布局直接搬到手机上，导致交互劣化。

**Mitigation:** 共享规则与组件能力，不共享桌面布局假设。

### Lifecycle Interruptions

**Risk:** 移动端切后台、杀进程导致状态丢失。

**Mitigation:** 将草稿恢复、保存时机和生命周期监听纳入平台适配层设计。

## Implementation Outcome

本方案的最终目标不是“复制一个桌面版到手机里”，而是把现有单一桌面仓库演进为一个可持续维护的多端产品仓库：

- 桌面端继续提供成熟的 Electron 体验。
- 移动端基于同一套共享核心能力快速落地。
- 新功能优先写在共享层，只在必要时为平台实现差异化接入。

## Next Step

下一步应基于本设计文档产出正式实现计划，按任务级别拆分仓库重组、共享层抽取、平台适配、移动端接入和测试策略。
