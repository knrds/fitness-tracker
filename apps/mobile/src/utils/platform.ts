import { Platform } from 'react-native';

const getNavigatorUserAgent = (): string => {
  if (typeof globalThis !== 'undefined') {
    const nav = (globalThis as { navigator?: { userAgent?: unknown } }).navigator;
    if (typeof nav?.userAgent === 'string') {
      return nav.userAgent;
    }
  }
  return '';
};

export const isIOSWeb = Platform.OS === 'web' && /iPad|iPhone|iPod/.test(getNavigatorUserAgent());

export const isIOS = Platform.OS === 'ios' || isIOSWeb;
