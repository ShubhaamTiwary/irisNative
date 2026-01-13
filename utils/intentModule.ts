/**
 * Native module for direct intent access
 * Bypasses React Native's Linking module timing issues on ChromeOS
 */
import { NativeModules, Platform } from 'react-native';

const { IntentModule } = NativeModules;

interface IntentModuleType {
  getInitialURL: () => Promise<string | null>;
}

export const getNativeInitialURL = async (): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    if (IntentModule && IntentModule.getInitialURL) {
      const url = await IntentModule.getInitialURL();
      console.log('[IntentModule] Native initial URL:', url);
      return url;
    }
    console.warn('[IntentModule] Native module not found');
    return null;
  } catch (error) {
    console.error('[IntentModule] Error getting native initial URL:', error);
    return null;
  }
};
