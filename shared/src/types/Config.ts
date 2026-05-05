export interface WebDAVConfig {
  serverUrl: string;           // WebDAV 服务器地址
  username: string;            // 用户名（邮箱）
  password: string;            // 应用密码
  dataPath: string;            // 数据目录路径（如 /论文管理/data/）
}

export interface AppConfig {
  webdav: WebDAVConfig;
  sortOrder: 'asc' | 'desc';   // 排序方式
  lastSyncTime?: string;       // 最后同步时间
}
