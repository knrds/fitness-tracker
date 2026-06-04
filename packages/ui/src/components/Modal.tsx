import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons'; // Assuming expo/vector-icons is available since it's an Expo app

export interface ModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  primaryActionTitle?: string;
  onPrimaryAction?: () => void;
  secondaryActionTitle?: string;
  onSecondaryAction?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  onClose,
  children,
  primaryActionTitle,
  onPrimaryAction,
  secondaryActionTitle,
  onSecondaryAction,
}) => {
  const theme = useTheme();
  const [shouldRender, setShouldRender] = useState(visible);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 15,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  return (
    <RNModal visible={shouldRender} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.overlayPressable} onPress={onClose}>
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Pressable style={styles.innerPressable} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <Text
                  style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}
                >
                  {title}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={styles.content}>{children}</View>
              {(primaryActionTitle || secondaryActionTitle) && (
                <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                  {secondaryActionTitle && (
                    <Button
                      title={secondaryActionTitle}
                      onPress={onSecondaryAction || onClose}
                      variant="ghost"
                      style={styles.actionButton}
                    />
                  )}
                  {primaryActionTitle && onPrimaryAction && (
                    <Button
                      title={primaryActionTitle}
                      onPress={onPrimaryAction}
                      variant="primary"
                      style={styles.actionButton}
                    />
                  )}
                </View>
              )}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.8)', // Semi-transparent background
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  innerPressable: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    borderTopWidth: 1,
    gap: 16,
  },
  actionButton: {
    minWidth: 100,
  },
});
