import {useState, useEffect, useCallback} from 'react';
import {Version} from '../types';
import {WebDAVService} from '../services/webdav';
import {CacheService} from '../services/cache';
import {handleError} from '../utils/errors';

interface UseVersionsResult {
  versions: Version[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  sortOrder: 'asc' | 'desc';
  loadVersions: (forceRefresh?: boolean) => Promise<void>;
  toggleSort: () => void;
  sortedVersions: Version[];
}

export function useVersions(
  webdav: WebDAVService,
  cache: CacheService,
): UseVersionsResult {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadVersions = useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // 如果不是强制刷新，先从缓存加载
        if (!forceRefresh) {
          const cachedData = await cache.getCachedVersions();
          if (cachedData) {
            setVersions(cachedData.versions);
            setLoading(false);
            // 继续后台更新
          }
        }

        // 从 WebDAV 加载最新数据
        const data = await webdav.getVersions();

        // 总是更新缓存和版本列表
        await cache.cacheVersions(data);
        setVersions(data.versions);
      } catch (err) {
        const errorMessage = handleError(err as Error);
        setError(errorMessage);

        // 如果是首次加载失败，尝试使用缓存
        if (!forceRefresh && versions.length === 0) {
          const cachedData = await cache.getCachedVersions();
          if (cachedData) {
            setVersions(cachedData.versions);
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [webdav, cache, versions.length],
  );

  const toggleSort = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedVersions = [...versions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    versions,
    loading,
    refreshing,
    error,
    sortOrder,
    loadVersions,
    toggleSort,
    sortedVersions,
  };
}
