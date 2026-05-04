import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {WebDAVConfig} from '../types';

const CONFIG_KEY = '@thesis_tracker:config';
const KEYCHAIN_SERVICE = 'com.thesistracker.webdav';

export class StorageService {
  async saveConfig(config: WebDAVConfig): Promise<void> {
    try {
      // 保存非敏感数据到 AsyncStorage
      const publicData = {
        serverUrl: config.serverUrl,
        username: config.username,
        dataPath: config.dataPath,
      };
      await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(publicData));

      // 保存密码到 Keychain
      await Keychain.setGenericPassword(config.username, config.password, {
        service: KEYCHAIN_SERVICE,
      });
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  async getConfig(): Promise<WebDAVConfig | null> {
    try {
      // 读取非敏感数据
      const publicDataStr = await AsyncStorage.getItem(CONFIG_KEY);
      if (!publicDataStr) {
        return null;
      }

      const publicData = JSON.parse(publicDataStr);

      // 读取密码
      const credentials = await Keychain.getGenericPassword({
        service: KEYCHAIN_SERVICE,
      });

      if (!credentials) {
        return null;
      }

      return {
        serverUrl: publicData.serverUrl,
        username: publicData.username,
        dataPath: publicData.dataPath,
        password: credentials.password,
      };
    } catch (error) {
      console.error('Failed to get config:', error);
      return null;
    }
  }

  async clearConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CONFIG_KEY);
      await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
    } catch (error) {
      throw new Error(`Failed to clear config: ${error}`);
    }
  }
}
