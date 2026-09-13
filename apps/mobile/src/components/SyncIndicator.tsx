import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, Easing, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@fitness-tracker/ui';
import { useSyncStore } from '../stores/syncStore';
import { useAuthStore } from '../stores/authStore';

export const SyncIndicator: React.FC = () => {
  const theme = useTheme();
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const user = useAuthStore((state) => state.user);
  const { queue, isSyncing, isOnline, syncError, processQueue } = useSyncStore();

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isSyncing) {
      spinValue.setValue(0);
      animation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animation.start();
    } else {
      spinValue.setValue(0);
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [isSyncing, spinValue]);

  // Sync indicator is hidden if Supabase is not configured or user is not logged in
  if (!isConfigured || !user) {
    return null;
  }

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  let iconName: keyof typeof Ionicons.glyphMap = 'cloud-done-outline';
  let iconColor = theme.colors.success; // Vibrant iOS green

  if (!isOnline) {
    iconName = 'cloud-offline-outline';
    iconColor = theme.colors.muted;
  } else if (isSyncing) {
    iconName = 'sync-outline';
    iconColor = theme.colors.primary;
  } else if (syncError) {
    iconName = 'alert-circle-outline';
    iconColor = theme.colors.warning; // Warm warning orange
  } else if (queue.length > 0) {
    iconName = 'cloud-upload-outline';
    iconColor = theme.colors.primary;
  }

  const handlePress = () => {
    processQueue();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.6 : 1.0 }]}
      accessibilityLabel="Sync Status Indicator"
      accessibilityRole="button"
    >
      {isSyncing ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </Animated.View>
      ) : (
        <Ionicons name={iconName} size={20} color={iconColor} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default SyncIndicator;
