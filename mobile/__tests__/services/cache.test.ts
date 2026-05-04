import {CacheService} from '../../src/services/cache';
import {ThesisData} from '../../src/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cache.clearCache();
  });

  it('should cache and retrieve versions', async () => {
    const data: ThesisData = {
      schemaVersion: '1.0',
      dataVersion: 1,
      versions: [],
      lastModified: '2026-05-04T10:00:00Z',
    };

    await cache.cacheVersions(data);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@thesis_tracker:versions_cache',
      JSON.stringify(data),
    );

    // Mock the retrieval
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(data),
    );

    const retrieved = await cache.getCachedVersions();

    expect(retrieved).toEqual(data);
  });

  it('should return null when no cache exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const data = await cache.getCachedVersions();
    expect(data).toBeNull();
  });

  it('should detect when update is needed', async () => {
    const data: ThesisData = {
      schemaVersion: '1.0',
      dataVersion: 1,
      versions: [],
      lastModified: '2026-05-04T10:00:00Z',
    };

    await cache.cacheVersions(data);

    // Mock the retrieval for needsUpdate
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(data),
    );

    const needsUpdate = await cache.needsUpdate('2026-05-04T11:00:00Z');
    expect(needsUpdate).toBe(true);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify(data),
    );

    const noUpdate = await cache.needsUpdate('2026-05-04T10:00:00Z');
    expect(noUpdate).toBe(false);
  });

  it('should clear cache', async () => {
    await cache.clearCache();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@thesis_tracker:versions_cache',
    );
  });
});
