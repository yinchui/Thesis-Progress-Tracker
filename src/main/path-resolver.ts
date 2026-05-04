import * as path from 'path'

export interface DataDirCandidatesInput {
  execPath: string
  userDataPath: string
}

export interface DataDirCandidates {
  primary: string
  fallback: string
}

export function resolveDataDirCandidates(input: DataDirCandidatesInput): DataDirCandidates {
  const appDir = path.dirname(input.execPath)
  return {
    primary: path.join(appDir, 'data'),
    fallback: path.join(input.userDataPath, 'data'),
  }
}
