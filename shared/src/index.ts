// Shared utilities and types for Thesis Tracker
// This package is shared between the Electron app and React Native mobile app

// Export types
export type {
  Version,
  ThesisData,
  WebDAVConfig,
  AppConfig,
} from './types';

// Export utilities
export {
  formatDate,
  formatDateTime,
  getRelativeTime,
  formatFileSize,
  getFileExtension,
  getFileIcon,
  isValidWebDAVUrl,
  isValidEmail,
  isValidDataPath,
} from './utils';
