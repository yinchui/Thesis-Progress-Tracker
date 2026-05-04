import React, {useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {VersionCard} from '../components/VersionCard';
import {LoadingSpinner} from '../components/LoadingSpinner';
import {useVersions} from '../hooks/useVersions';
import {WebDAVService} from '../services/webdav';
import {CacheService} from '../services/cache';
import {StorageService} from '../services/storage';

interface Props {
  onSettings: () => void;
}

export const TimelineScreen: React.FC<Props> = ({onSettings}) => {
  const storage = new StorageService();
  const webdav = new WebDAVService();
  const cache = new CacheService();

  useEffect(() => {
    // 初始化 WebDAV 服务
    const initWebDAV = async () => {
      const config = await storage.getConfig();
      if (config) {
        webdav.initialize(config);
      }
    };
    initWebDAV();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {sortedVersions, loading, refreshing, error, loadVersions, toggleSort} =
    useVersions(webdav, cache);

  const handleVersionPress = (_versionId: string) => {
    // 后续阶段实现
    Alert.alert('提示', '版本详情功能将在后续版本中实现');
  };

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <Text style={styles.navTitle}>论文版本历史</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleSort}>
            <Text style={styles.iconText}>↕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onSettings}>
            <Text style={styles.iconText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={sortedVersions}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <VersionCard
            version={item}
            onPress={() => handleVersionPress(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVersions(true)}
            colors={['#2D5A4A']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无版本记录</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  navbar: {
    backgroundColor: '#2D5A4A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    color: '#2D5A4A',
  },
  errorBanner: {
    backgroundColor: '#FEE',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FCC',
  },
  errorText: {
    color: '#B83B3B',
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
