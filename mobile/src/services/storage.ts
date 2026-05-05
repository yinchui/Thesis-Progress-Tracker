import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  dataPath: string;
}

const CONFIG_KEY = 'webdav_config';

// Web platform fallback using localStorage
const webStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  deleteItem: (key: string) => localStorage.removeItem(key),
};

export async function saveConfig(config: WebDAVConfig): Promise<void> {
  const json = JSON.stringify(config);
  if (Platform.OS === 'web') {
    webStorage.setItem(CONFIG_KEY, json);
  } else {
    await SecureStore.setItemAsync(CONFIG_KEY, json);
  }
}

export async function getConfig(): Promise<WebDAVConfig | null> {
  let json: string | null;
  if (Platform.OS === 'web') {
    json = webStorage.getItem(CONFIG_KEY);
  } else {
    json = await SecureStore.getItemAsync(CONFIG_KEY);
  }
  if (!json) return null;
  try {
    return JSON.parse(json) as WebDAVConfig;
  } catch {
    return null;
  }
}

export async function clearConfig(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.deleteItem(CONFIG_KEY);
  } else {
    await SecureStore.deleteItemAsync(CONFIG_KEY);
  }
}
