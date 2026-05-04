import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {WebDAVConfig} from '../types';
import {StorageService} from '../services/storage';
import {WebDAVService} from '../services/webdav';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<Props> = ({onLoginSuccess}) => {
  const [config, setConfig] = useState<WebDAVConfig>({
    serverUrl: 'https://dav.jianguoyun.com/dav/',
    username: '',
    password: '',
    dataPath: '/论文管理/data/',
  });
  const [loading, setLoading] = useState(false);

  const storage = new StorageService();
  const webdav = new WebDAVService();

  const handleTestConnection = async () => {
    if (!config.username || !config.password) {
      Alert.alert('错误', '请填写用户名和密码');
      return;
    }

    setLoading(true);
    try {
      webdav.initialize(config);
      await webdav.testConnection();
      Alert.alert('成功', '连接测试成功');
    } catch (error: any) {
      Alert.alert('错误', error.message || '连接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndLogin = async () => {
    if (!config.username || !config.password) {
      Alert.alert('错误', '请填写用户名和密码');
      return;
    }

    setLoading(true);
    try {
      webdav.initialize(config);
      await webdav.testConnection();
      await storage.saveConfig(config);
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('错误', error.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>论文进度管理器</Text>
        <Text style={styles.subtitle}>配置 WebDAV 连接</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>服务器地址</Text>
        <TextInput
          style={styles.input}
          value={config.serverUrl}
          onChangeText={text => setConfig({...config, serverUrl: text})}
          placeholder="https://dav.jianguoyun.com/dav/"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>用户名（邮箱）</Text>
        <TextInput
          style={styles.input}
          value={config.username}
          onChangeText={text => setConfig({...config, username: text})}
          placeholder="your.email@example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={styles.label}>应用密码</Text>
        <TextInput
          style={styles.input}
          value={config.password}
          onChangeText={text => setConfig({...config, password: text})}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>数据目录路径</Text>
        <TextInput
          style={styles.input}
          value={config.dataPath}
          onChangeText={text => setConfig({...config, dataPath: text})}
          placeholder="/论文管理/data/"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestConnection}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#2D5A4A" />
          ) : (
            <Text style={styles.testButtonText}>测试连接</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleSaveAndLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>保存并登录</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#2D5A4A',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4FD',
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE3EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D5A4A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5A4A',
  },
  loginButton: {
    backgroundColor: '#2D5A4A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
