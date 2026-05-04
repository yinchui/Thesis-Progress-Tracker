import AsyncStorage from '@react-native-async-storage/async-storage';
import {ThesisData} from '../types';

const CACHE_KEY = '@thesis_tracker:versions_cache';

export class CacheService {
  async cacheVersions(data: ThesisData): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cache versions:', error);
      throw new Error(`Failed to cache versions: ${error}`);
    }
  }

  async getCachedVersions(): Promise<ThesisData | null> {
    try {
      const dataStr = await AsyncStorage.getItem(CACHE_KEY);
      if (!dataStr) {
        return null;
      }
      return JSON.parse(dataStr);
    } catch (error) {
      console.error('Failed to get cached versions:', error);
      return null;
    }
  }

  async getCachedLastModified(): Promise<string | null> {
    const data = await this.getCachedVersions();
    return data?.lastModified ?? null;
  }

  async needsUpdate(remoteLastModified: string): Promise<boolean> {
    const cachedLastModified = await this.getCachedLastModified();
    if (cachedLastModified === null) {
      return true;
    }
    return remoteLastModified !== cachedLastModified;
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw new Error(`Failed to clear cache: ${error}`);
    }
  }
}
