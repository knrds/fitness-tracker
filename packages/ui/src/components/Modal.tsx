import React from 'react';
import { View, Text, StyleSheet, Modal as RNModal, TouchableOpacity } from 'react-native';
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

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}>
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
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.8)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
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
