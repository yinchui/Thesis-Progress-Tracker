// 导出 shared 包的类型
export type {
  Version,
  ThesisData,
  WebDAVConfig,
  AppConfig,
} from '@thesis-tracker/shared'

// 导出 shared 包的工具函数
export {
  formatDate,
  formatDateTime,
  getRelativeTime,
  formatFileSize,
  getFileExtension,
  getFileIcon,
  isValidWebDAVUrl,
  isValidEmail,
  isValidDataPath,
} from '@thesis-tracker/shared'
