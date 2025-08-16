// Mock for react-native dependencies in web environment
// This file provides empty implementations for react-native APIs

export const Platform = {
  OS: 'web',
  Version: 1,
  select: (obj: any) => obj.web || obj.default,
};

export const NativeModules = {};

export const requireNativeComponent = () => null;

export const AppRegistry = {
  registerComponent: () => {},
  runApplication: () => {},
};

export const Alert = {
  alert: (title: string, message?: string) => {
    window.alert(`${title}${message ? '\n' + message : ''}`);
  },
};

export const Dimensions = {
  get: (dim: string) => {
    if (dim === 'window') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 0, height: 0 };
  },
};

export const Linking = {
  openURL: (url: string) => window.open(url, '_blank'),
  canOpenURL: () => Promise.resolve(true),
};

export default {
  Platform,
  NativeModules,
  requireNativeComponent,
  AppRegistry,
  Alert,
  Dimensions,
  Linking,
};