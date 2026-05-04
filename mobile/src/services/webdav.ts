import axios, { AxiosInstance } from 'axios'
import { WebDAVConfig, ThesisData } from '../types'
import { NetworkError, AuthError, NotFoundError } from '../utils/errors'

export class WebDAVService {
  private config: WebDAVConfig | null = null
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      timeout: 30000,
    })
  }

  initialize(config: WebDAVConfig): void {
    this.config = config
    this.client.defaults.auth = {
      username: config.username,
      password: config.password,
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      throw new Error('WebDAV service not initialized')
    }

    try {
      const url = `${this.config.serverUrl}${this.config.dataPath.substring(1)}`
      await this.client.request({
        method: 'PROPFIND',
        url,
        headers: {
          Depth: '0',
        },
      })
      return true
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AuthError('认证失败')
      } else if (error.response?.status === 404) {
        throw new NotFoundError('路径不存在')
      } else if (error.code === 'ECONNABORTED' || !error.response) {
        throw new NetworkError('网络连接失败')
      }
      throw error
    }
  }

  async getVersions(): Promise<ThesisData> {
    if (!this.config) {
      throw new Error('WebDAV service not initialized')
    }

    try {
      const url = `${this.config.serverUrl}${this.config.dataPath.substring(1)}versions.json`
      const response = await this.client.get<ThesisData>(url)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new AuthError('认证失败')
      } else if (error.response?.status === 404) {
        throw new NotFoundError('versions.json 不存在')
      } else if (error.code === 'ECONNABORTED' || !error.response) {
        throw new NetworkError('网络连接失败')
      }
      throw error
    }
  }

  async downloadFile(filePath: string): Promise<string> {
    // 后续阶段实现
    throw new Error('Not implemented')
  }
}
