import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getConfig } from '../services/storage';
import { listFolder, downloadFile, FileEntry } from '../services/webdav';

interface Props {
  onLogout: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function TimelineScreen({ onLogout }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [pathStack, setPathStack] = useState<string[]>([]);

  const fetchEntries = useCallback(async (path?: string) => {
    try {
      const config = await getConfig();
      if (!config) {
        Alert.alert('错误', '未找到配置信息');
        return;
      }
      const targetPath = path ?? config.dataPath;
      if (currentPath === null) setCurrentPath(targetPath);
      const list = await listFolder(config, targetPath);
      setEntries(list);
    } catch (error: any) {
      Alert.alert('错误', `加载失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchEntries();
  }, []);

  const openFolder = useCallback(async (entry: FileEntry) => {
    setLoading(true);
    setPathStack(prev => [...prev, currentPath!]);
    setCurrentPath(entry.path);
    try {
      const config = await getConfig();
      if (!config) return;
      const list = await listFolder(config, entry.path);
      setEntries(list);
    } catch (error: any) {
      Alert.alert('错误', `加载失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  const openFile = useCallback(async (entry: FileEntry) => {
    try {
      const config = await getConfig();
      if (!config) return;
      await downloadFile(config, entry.path, entry.name);
    } catch (error: any) {
      Alert.alert('错误', `下载失败: ${error.message || '未知错误'}`);
    }
  }, []);

  const goBack = useCallback(async () => {
    if (pathStack.length === 0) return;
    const prevPath = pathStack[pathStack.length - 1];
    setPathStack(prev => prev.slice(0, -1));
    setCurrentPath(prevPath);
    setLoading(true);
    try {
      const config = await getConfig();
      if (!config) return;
      const list = await listFolder(config, prevPath);
      setEntries(list);
    } catch (error: any) {
      Alert.alert('错误', `加载失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [pathStack]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEntries(currentPath ?? undefined);
  }, [currentPath, fetchEntries]);

  const renderItem = ({ item }: { item: FileEntry }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => item.isFolder ? openFolder(item) : openFile(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, item.isFolder ? styles.badgeFolder : styles.badgeFile]}>
          <Text style={styles.badgeText}>
            {item.isFolder ? '📁 文件夹' : item.name.split('.').pop()?.toUpperCase() || '文件'}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.fileName} numberOfLines={2}>{item.name}</Text>
      {!item.isFolder && item.size > 0 && (
        <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
      )}
    </TouchableOpacity>
  );

  const currentFolderName = currentPath ? currentPath.split('/').filter(Boolean).pop() : '版本历史';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {pathStack.length > 0 && (
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backText}>‹ 返回</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {pathStack.length === 0 ? '版本历史' : currentFolderName}
          </Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.settingsButton}>
          <Text style={styles.settingsText}>设置</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D5A4A" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => `${item.path}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2D5A4A"
              colors={['#2D5A4A']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无文件</Text>
              <Text style={styles.emptySubtext}>下拉刷新重试</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#2D5A4A',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backButton: { marginRight: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: '300' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1 },
  settingsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  settingsText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#2D5A4A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeFolder: { backgroundColor: '#e8f0ed' },
  badgeFile: { backgroundColor: '#2D5A4A' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#2D5A4A' },
  dateText: { fontSize: 12, color: '#888' },
  fileName: { fontSize: 15, color: '#333', fontWeight: '500', marginBottom: 4 },
  fileSize: { fontSize: 13, color: '#999' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999' },
});
