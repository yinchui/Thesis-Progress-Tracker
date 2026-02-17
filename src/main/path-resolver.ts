import * as path from 'path'

export type GetPath = (name: 'userData') => string

export function resolveDataDir(getPath: GetPath): string {
  return path.join(getPath('userData'), 'data')
}
