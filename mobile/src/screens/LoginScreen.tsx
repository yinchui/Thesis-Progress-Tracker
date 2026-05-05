import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { saveConfig, getConfig } from '../services/storage';
import { testConnection } from '../services/webdav';

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [url, setUrl] = useState('https://dav.jianguoyun.com/dav/');
  const [username, setUsername] = useState('2900763885@qq.com');
  const [password, setPassword] = useState('apcpbaz9wxtyjdci');
  const [dataPath, setDataPath] = useState('/我的坚果云/论文');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load saved config on mount
    (async () => {
      const config = await getConfig();
      if (config) {
        setUrl(config.url);
        setUsername(config.username);
        setPassword(config.password);
        setDataPath(config.dataPath);
      }
    })();
  }, []);

  const handleTestConnection = async () => {
    if (!url || !username || !password) {
      Alert.alert('提示', '请填写所有必填字段');
      return;
    }
    setTesting(true);
    try {
      const success = await testConnection({ url, username, password, dataPath });
      if (success) {
        Alert.alert('成功', '连接测试通过！');
      } else {
        Alert.alert('失败', '无法连接到 WebDAV 服务器，请检查配置');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '连接测试失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url || !username || !password) {
      Alert.alert('提示', '请填写所有必填字段');
      return;
    }
    try {
      await saveConfig({ url, username, password, dataPath });
      onLoginSuccess();
    } catch (error: any) {
      Alert.alert('错误', '保存配置失败');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>论文进度追踪器</Text>
          <Text style={styles.subtitle}>配置 WebDAV 连接</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>服务器地址 *</Text>
          <TextInput
            style={styles.input}
            placeholder="https://your-webdav-server.com"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.label}>用户名 *</Text>
          <TextInput
            style={styles.input}
            placeholder="用户名"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>密码 *</Text>
          <TextInput
            style={styles.input}
            placeholder="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>数据路径</Text>
          <TextInput
            style={styles.input}
            placeholder="/thesis-data"
            value={dataPath}
            onChangeText={setDataPath}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            onPress={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>测试连接</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>保存并登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5A4A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  testButton: {
    backgroundColor: '#5A8A7A',
  },
  saveButton: {
    backgroundColor: '#2D5A4A',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
