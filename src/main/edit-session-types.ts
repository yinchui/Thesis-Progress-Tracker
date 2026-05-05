export interface EditSessionParams {
  baseVersionId: string
  thesisId: string
  baseFilePath: string
  baseFileName: string
  baseFileType: string
  versionInfo: {
    version: string
    changes?: string
    focus?: string
  }
  /** If user uploaded a replacement file, use this path instead of baseFilePath */
  replacementFilePath?: string
}

export interface EditSession {
  newVersionId: string
  baseVersionId: string
  thesisId: string
  versionInfo: {
    version: string
    changes?: string
    focus?: string
  }
  editFilePath: string
  fileName: string
  fileType: string
  autoArchive: boolean
  date: string
}
