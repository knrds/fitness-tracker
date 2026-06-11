import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isExpoGo =
  Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
