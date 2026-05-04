import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Version, formatDate, formatFileSize, getFileIcon} from '../types';

interface Props {
  version: Version;
  onPress: () => void;
}

export const VersionCard: React.FC<Props> = ({version, onPress}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.versionNumber}>{version.version}</Text>
        <Text style={styles.date}>{formatDate(version.date)}</Text>
      </View>

      <Text style={styles.changes}>{version.changes}</Text>
      <Text style={styles.focus}>{version.focus}</Text>

      <View style={styles.fileInfo}>
        <Text style={styles.fileIcon}>{getFileIcon(version.fileName)}</Text>
        <Text style={styles.fileName}>{version.fileName}</Text>
        {version.fileSize && (
          <Text style={styles.fileSize}>
            {formatFileSize(version.fileSize)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  changes: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  focus: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileIcon: {
    fontSize: 16,
  },
  fileName: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
  fileSize: {
    fontSize: 13,
    color: '#999999',
  },
});
