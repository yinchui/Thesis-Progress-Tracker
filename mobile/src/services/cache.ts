import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThesisData } from '../types'

const CACHE_KEY = '@thesis_tracker:versions_cache'

export class CacheService {
  async cacheVersions(data: ThesisData): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to cache versions:', error)
      throw new Error(`Failed to cache versions: ${error}`)
    }
  }

  async getCachedVersions(): Promise<ThesisData | null> {
    try {
      const dataStr = await AsyncStorage.getItem(CACHE_KEY)
      if (!dataStr) {
        return null
      }
      return JSON.parse(dataStr)
    } catch (error) {
      console.error('Failed to get cached versions:', error)
      return null
    }
  }

  async getCachedDataVersion(): Promise<number | null> {
    const data = await this.getCachedVersions()
    return data?.dataVersion ?? null
  }

  async needsUpdate(remoteDataVersion: number): Promise<boolean> {
    const cachedVersion = await this.getCachedDataVersion()
    if (cachedVersion === null) {
      return true
    }
    return remoteDataVersion > cachedVersion
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw new Error(`Failed to clear cache: ${error}`)
    }
  }
}
