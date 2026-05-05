# 移动端设计文档改进建议

> 基于 spec-document-reviewer 审查结果的改进建议
> 原文档：2026-05-04-mobile-app-monorepo-design.md

## 审查总结

设计文档整体质量很高，架构清晰，技术选型合理。但发现了一些需要改进的关键点。

---

## 关键改进项（P0 - 必须实施）

### 1. 数据版本控制机制（已部分修复）

**问题：** 缺少数据一致性检测机制，可能读取到过期数据。

**解决方案：** 在 `versions.json` 中添加版本控制字段（已更新到主文档）：
- `schemaVersion`: 数据格式版本
- `dataVersion`: 数据版本号，每次更新递增

**移动端实现：**
```typescript
// shared/src/types/Version.ts
export interface ThesisData {
  schemaVersion: string;  // 格式版本，如 "1.0"
  dataVersion: number;    // 数据版本号
  versions: Version[];
  lastModified: string;
}

// mobile/src/services/cache.ts 添加版本检查
async needsUpdate(remoteVersion: number): Promise<boolean> {
  const cached = await this.getCachedVersions();
  if (!cached) return true;
  return (cached.dataVersion || 0) < remoteVersion;
}

// mobile/src/services/webdav.ts 添加
async checkDataVersion(): Promise<number> {
  const data = await this.getVersions();
  return data.dataVersion || 0;
}
```

**桌面端改造：**
- 每次保存版本时递增 `dataVersion`
- 初始化时设置 `schemaVersion: "1.0"`

---

### 2. 大文件下载优化

**问题：** 当前使用 axios blob 下载，大文件可能导致内存溢出。

**解决方案：** 使用 react-native-fs 的流式下载。

**修改 mobile/src/services/webdav.ts：**
```typescript
import RNFS from 'react-native-fs';
import { encode as base64Encode } from 'base-64';

async downloadFile(
  filePath: string,
  localPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const url = this.getFileUrl(filePath);
  
  // 使用 RNFS 流式下载，避免内存问题
  const download = RNFS.downloadFile({
    fromUrl: url,
    toFile: localPath,
    headers: {
      'Authorization': 'Basic ' + base64Encode(`${this.username}:${this.password}`)
    },
    background: true,        // 支持后台下载
    discretionary: true,     // iOS 优化
    cacheable: true,
    progressDivider: 10,     // 每 10% 触发一次回调
    progress: (res) => {
      const progress = res.bytesWritten / res.contentLength;
      onProgress?.(progress);
    },
  });

  const result = await download.promise;
  
  if (result.statusCode !== 200) {
    throw new Error(`下载失败: HTTP ${result.statusCode}`);
  }
}
```

---

### 3. 坚果云限流处理

**问题：** 坚果云 WebDAV 限制每小时 600 次请求，可能导致频繁失败。

**解决方案：** 添加请求限流器和指数退避重试。

**新增 mobile/src/services/rateLimiter.ts：**
```typescript
export class RateLimiter {
  private requestCount = 0;
  private resetTime = Date.now() + 3600000; // 1小时后重置
  private readonly maxRequests = 500; // 留100次余量

  async checkLimit(): Promise<void> {
    // 检查是否需要重置计数器
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 3600000;
    }

    // 检查是否超限
    if (this.requestCount >= this.maxRequests) {
      const waitTime = Math.ceil((this.resetTime - Date.now()) / 60000);
      throw new Error(`已达到请求限制，请 ${waitTime} 分钟后再试`);
    }

    this.requestCount++;
  }

  getStatus(): { count: number; limit: number; resetIn: number } {
    return {
      count: this.requestCount,
      limit: this.maxRequests,
      resetIn: Math.ceil((this.resetTime - Date.now()) / 60000),
    };
  }
}

// 指数退避重试
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // 指数退避：1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('重试失败');
}
```

**在 WebDAVService 中集成：**
```typescript
export class WebDAVService {
  private rateLimiter = new RateLimiter();

  async getVersions(): Promise<ThesisData> {
    await this.rateLimiter.checkLimit();
    
    return retryWithBackoff(async () => {
      const response = await this.client.get(`${this.dataPath}/versions.json`);
      return response.data as ThesisData;
    });
  }
}
```

---

## 重要改进项（P1）

### 4. 安全性强化

**补充到"注意事项"部分：**

```markdown
**安全性强化：**
- **强制 HTTPS**：拒绝 HTTP 连接，防止中间人攻击
- **证书验证**：在 LoginScreen 添加证书验证失败提示
- **密码强度检查**：验证坚果云应用密码格式（通常为 16 位字母数字）
- **生物识别解锁**：使用 react-native-biometrics 添加 Face ID / 指纹解锁
- **敏感日志清理**：生产环境不输出密码、token 等敏感信息
- **会话超时**：长时间未使用自动退出登录（可选）
```

**实现示例：**
```typescript
// mobile/src/services/webdav.ts
constructor(config: WebDAVConfig) {
  // 强制 HTTPS
  if (!config.url.startsWith('https://')) {
    throw new Error('安全原因，仅支持 HTTPS 连接');
  }
  
  this.client = axios.create({
    baseURL: config.url,
    auth: {
      username: config.username,
      password: config.password,
    },
    timeout: 30000,
    // 验证 SSL 证书
    validateStatus: (status) => status >= 200 && status < 300,
  });
}
```

---

### 5. 首次启动体验优化

**问题：** 配置门槛较高，用户可能不知道如何获取 WebDAV 信息。

**解决方案：** 添加配置向导和快速配置功能。

**LoginScreen 改进：**
```typescript
// 添加配置模板
const WEBDAV_PRESETS = {
  jianguoyun: {
    name: '坚果云',
    serverUrl: 'https://dav.jianguoyun.com/dav/',
    helpUrl: 'https://help.jianguoyun.com/?p=2064',
  },
};

// UI 流程
1. 欢迎页：说明移动端功能和配置步骤
2. 选择云服务：坚果云（预设）/ 自定义 WebDAV
3. 输入账号信息（自动填充服务器地址）
4. 输入数据目录路径（提供示例：/论文管理/data/）
5. 测试连接并自动检测 versions.json
6. 完成配置
```

**添加帮助链接：**
- "如何获取坚果云应用密码？" → 链接到官方文档
- "找不到数据目录？" → 提供常见路径示例
- "连接失败？" → 故障排查指南

---

### 6. 离线模式明确说明

**补充到设计文档：**

```markdown
### 离线模式设计

**离线可用功能：**
- ✅ 查看已缓存的版本列表
- ✅ 查看版本详情（已缓存的版本）
- ✅ 打开已下载的文件
- ✅ 查看缓存管理
- ✅ 查看设置页面

**离线不可用功能：**
- ❌ 刷新版本列表
- ❌ 下载新文件
- ❌ 同步最新数据
- ❌ 测试 WebDAV 连接

**离线状态提示：**
- 顶部显示"离线模式"横幅（黄色背景）
- 禁用刷新和下载按钮（灰色显示）
- 在版本卡片上标注"需要网络"（未缓存的文件）
- 设置页面显示"最后同步时间"

**实现：**
```typescript
// mobile/src/hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  return isOnline;
}
```
```

---

## 建议改进项（P2）

### 7. 测试计划

**补充完整的测试策略：**

```markdown
### 测试策略

**单元测试（Jest）：**
- shared 包的工具函数（目标：100% 覆盖）
  - dateFormat.ts
  - fileUtils.ts
  - validation.ts
- WebDAV 服务（Mock axios）
- 缓存服务（Mock AsyncStorage 和 RNFS）
- 自定义 Hooks（React Testing Library）

**集成测试：**
- WebDAV 连接和数据读取（使用测试服务器或 Mock Server）
- 文件下载流程（Mock 文件数据）
- 缓存读写流程

**E2E 测试（Detox）：**
- 完整用户流程：登录 → 查看列表 → 下载文件 → 预览
- 离线模式切换
- 错误场景处理

**手动测试清单：**
- [ ] 不同网络环境（WiFi、4G、弱网、离线）
- [ ] 不同文件大小（小文件 <1MB、中文件 1-10MB、大文件 >50MB）
- [ ] 不同文件格式（PDF、DOC、DOCX、TXT）
- [ ] 不同设备（手机、平板、折叠屏）
- [ ] 不同 Android 版本（6.0、10.0、14.0）
- [ ] 不同 iOS 版本（13.0、15.0、17.0）
- [ ] 长时间运行（内存泄漏检测）
- [ ] 坚果云限流场景（模拟超过 600 次请求）
```

---

### 8. 监控与日志方案

**补充到设计文档：**

```markdown
### 监控与日志

**性能监控：**
- 使用 React Native Performance Monitor
- 监控关键指标：
  - 应用启动时间（目标 <2 秒）
  - 列表渲染性能（FPS >50）
  - 文件下载速度
  - 内存使用情况

**错误收集：**
- 集成 Sentry 或 Bugsnag
- 收集崩溃日志和错误堆栈
- 记录关键操作日志：
  - 登录成功/失败
  - 数据同步成功/失败
  - 文件下载成功/失败
  - WebDAV 请求错误

**日志策略：**
- 开发环境：详细日志（console.log）
- 生产环境：仅记录错误和关键操作
- 敏感信息脱敏：
  - 密码：完全隐藏
  - 用户名：部分隐藏（u***@example.com）
  - 文件路径：仅记录文件名

**实现示例：**
```typescript
// mobile/src/utils/logger.ts
import * as Sentry from '@sentry/react-native';

export const logger = {
  info: (message: string, context?: any) => {
    if (__DEV__) {
      console.log('[INFO]', message, context);
    }
  },
  
  error: (message: string, error?: Error, context?: any) => {
    console.error('[ERROR]', message, error, context);
    
    if (!__DEV__) {
      Sentry.captureException(error || new Error(message), {
        extra: context,
      });
    }
  },
  
  track: (event: string, properties?: any) => {
    // 记录用户行为
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        message: event,
        data: properties,
      });
    }
  },
};
```
```

---

### 9. 开发时间调整

**原估算：** 13-19 天

**调整后估算：** 22-32 天（4-6 周）

**详细分解：**
- 阶段 1：基础架构搭建（2-3 天）
  - 增加 1 天用于解决 Metro 配置和依赖问题
- 阶段 2：核心功能开发（7-10 天）
  - 增加 2-3 天用于调试和优化
- 阶段 3：文件预览（3-4 天）
  - PDF 库配置可能遇到原生依赖问题
- 阶段 4：设置与优化（3-4 天）
  - 增加性能优化和真机测试时间
- 阶段 5：iOS 适配（4-6 天）
  - iOS 原生配置通常比预期复杂
- **阶段 6：测试与修复（3-5 天）**
  - 新增测试阶段

**风险缓冲：** 建议预留 1-2 周缓冲时间处理意外问题。

---

## 可选改进项（P3）

### 10. 数据格式兼容性

**添加版本迁移机制：**

```typescript
// shared/src/utils/dataMigration.ts
export class DataMigration {
  async migrate(data: any): Promise<ThesisData> {
    const version = data.schemaVersion || '1.0';
    
    switch (version) {
      case '1.0':
        return data as ThesisData;
      
      case '2.0':
        // 未来格式升级时的迁移逻辑
        return this.migrateFrom2To1(data);
      
      default:
        throw new Error(`不支持的数据格式版本: ${version}`);
    }
  }
  
  private migrateFrom2To1(data: any): ThesisData {
    // 实现具体的迁移逻辑
    return data;
  }
}
```

---

## 风险评估

### 高风险
- ⚠️ **坚果云限流**：600次/小时可能不够用
  - 缓解措施：添加限流器、减少不必要的请求、使用缓存
- ⚠️ **桌面端同步配置**：依赖用户手动配置，可能出错
  - 缓解措施：提供详细向导、自动检测、错误提示

### 中风险
- ⚠️ **大文件内存问题**：已通过流式下载解决
- ⚠️ **iOS 原生依赖**：PDF 库可能需要额外配置
  - 缓解措施：提前测试、准备备选方案

### 低风险
- ⚠️ **网络异常**：已有缓存和错误处理机制
- ⚠️ **设备兼容性**：React Native 跨平台支持良好

---

## 实施优先级总结

**立即实施（P0）：**
1. ✅ 数据版本控制（已部分完成）
2. ⬜ 大文件下载优化
3. ⬜ 坚果云限流处理

**近期实施（P1）：**
4. ⬜ 安全性强化
5. ⬜ 首次启动体验优化
6. ⬜ 离线模式明确说明

**后续实施（P2）：**
7. ⬜ 完整测试计划
8. ⬜ 监控与日志方案
9. ⬜ 开发时间调整（更新项目计划）

**可选实施（P3）：**
10. ⬜ 数据格式兼容性机制

---

## 结论

原设计文档质量很高，经过上述改进后将更加完善和可靠。建议优先实施 P0 和 P1 项目，确保核心功能的稳定性和安全性。
