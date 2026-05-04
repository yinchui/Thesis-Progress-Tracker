// Shared utilities and types for Thesis Tracker
// This package is shared between the Electron app and React Native mobile app

export const greet = (name: string): string => {
  return `Hello, ${name}!`;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString();
};

// Add more shared utilities here as needed
