export interface Version {
  id: string;                  // 唯一标识
  version: string;             // 版本号（如 v2.0）
  date: string;                // ISO 8601 格式日期
  changes: string;             // 修改内容
  focus: string;               // 当前重点
  fileName: string;            // 文件名
  filePath: string;            // 相对路径（相对于 data/ 目录）
  fileSize?: number;           // 文件大小（字节）
}

export interface ThesisData {
  versions: Version[];         // 版本列表
  lastModified: string;        // 最后修改时间
}
