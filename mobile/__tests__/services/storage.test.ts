import {StorageService} from '../../src/services/storage';
import {WebDAVConfig} from '../../src/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await storage.clearConfig();
  });

  it('should save and retrieve config', async () => {
    const config: WebDAVConfig = {
      serverUrl: 'https://dav.jianguoyun.com/dav/',
      username: 'test@example.com',
      password: 'test-password',
      dataPath: '/论文管理/data/',
    };

    // Mock AsyncStorage.setItem
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    // Mock Keychain.setGenericPassword
    (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

    await storage.saveConfig(config);

    // Verify AsyncStorage was called with correct data
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@thesis_tracker:config',
      JSON.stringify({
        serverUrl: config.serverUrl,
        username: config.username,
        dataPath: config.dataPath,
      }),
    );

    // Verify Keychain was called with password
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      config.username,
      config.password,
      {service: 'com.thesistracker.webdav'},
    );

    // Mock retrieval
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        serverUrl: config.serverUrl,
        username: config.username,
        dataPath: config.dataPath,
      }),
    );
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: config.username,
      password: config.password,
    });

    const retrieved = await storage.getConfig();

    expect(retrieved).toEqual(config);
  });

  it('should return null when no config exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const config = await storage.getConfig();
    expect(config).toBeNull();
  });

  it('should return null when no password exists in keychain', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        serverUrl: 'https://dav.jianguoyun.com/dav/',
        username: 'test@example.com',
        dataPath: '/论文管理/data/',
      }),
    );
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const config = await storage.getConfig();
    expect(config).toBeNull();
  });

  it('should clear config', async () => {
    const config: WebDAVConfig = {
      serverUrl: 'https://dav.jianguoyun.com/dav/',
      username: 'test@example.com',
      password: 'test-password',
      dataPath: '/论文管理/data/',
    };

    // Mock save
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

    await storage.saveConfig(config);

    // Mock clear
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

    await storage.clearConfig();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      '@thesis_tracker:config',
    );
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'com.thesistracker.webdav',
    });

    // Mock retrieval after clear
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const retrieved = await storage.getConfig();
    expect(retrieved).toBeNull();
  });
});
