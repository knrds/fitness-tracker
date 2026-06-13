import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeProvider';
import { Button } from './components/Button';

export type DialogTone = 'default' | 'success' | 'danger';
export type DialogActionVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface DialogAction<TValue = string> {
  label: string;
  value?: TValue;
  variant?: DialogActionVariant;
}

export interface DialogOptions {
  title: string;
  message?: string;
  tone?: DialogTone;
  actions?: DialogAction[];
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  showCheckbox?: boolean;
  checkboxLabel?: string;
  onCheckboxToggle?: (checked: boolean) => void;
}

export interface ActionSheetOptions<TValue extends string = string> {
  title: string;
  message?: string;
  actions: Array<DialogAction<TValue>>;
  cancelLabel?: string;
  tone?: DialogTone;
}

interface DialogContextValue {
  showAlert: (options: DialogOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showActionSheet: <TValue extends string = string>(
    options: ActionSheetOptions<TValue>,
  ) => Promise<TValue | undefined>;
}

interface ActiveDialog {
  title: string;
  message: string | undefined;
  tone: DialogTone;
  actions: DialogAction[];
  resolve: (value?: string) => void;
  showCheckbox?: boolean | undefined;
  checkboxLabel?: string | undefined;
  onCheckboxToggle?: ((checked: boolean) => void) | undefined;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [checked, setChecked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const openDialog = useCallback(
    (nextDialog: ActiveDialog) => {
      setChecked(false);
      setDialog(nextDialog);
      fadeAnim.setValue(0);
      slideAnim.setValue(18);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    },
    [fadeAnim, slideAnim],
  );

  const closeDialog = useCallback(
    (value?: string) => {
      const currentDialog = dialog;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 18,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setDialog(null);
        currentDialog?.resolve(value);
      });
    },
    [dialog, fadeAnim, slideAnim],
  );

  const showAlert = useCallback(
    (options: DialogOptions) =>
      new Promise<void>((resolve) => {
        openDialog({
          title: options.title,
          message: options.message,
          tone: options.tone ?? 'default',
          actions: options.actions ?? [{ label: 'OK', value: 'ok', variant: 'primary' }],
          resolve: () => resolve(),
        });
      }),
    [openDialog],
  );

  const showConfirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        openDialog({
          title: options.title,
          message: options.message,
          tone: options.destructive ? 'danger' : 'default',
          actions: [
            { label: options.cancelLabel ?? 'Cancel', value: 'cancel', variant: 'secondary' },
            {
              label: options.confirmLabel ?? 'OK',
              value: 'confirm',
              variant: options.destructive ? 'danger' : 'primary',
            },
          ],
          showCheckbox: options.showCheckbox,
          checkboxLabel: options.checkboxLabel,
          onCheckboxToggle: options.onCheckboxToggle,
          resolve: (value) => resolve(value === 'confirm'),
        });
      }),
    [openDialog],
  );

  const showActionSheet = useCallback(
    <TValue extends string = string>(options: ActionSheetOptions<TValue>) =>
      new Promise<TValue | undefined>((resolve) => {
        openDialog({
          title: options.title,
          message: options.message,
          tone: options.tone ?? 'default',
          actions: [
            ...options.actions,
            { label: options.cancelLabel ?? 'Cancel', value: 'cancel', variant: 'secondary' },
          ],
          resolve: (value) => {
            resolve(value === 'cancel' ? undefined : (value as TValue | undefined));
          },
        });
      }),
    [openDialog],
  );

  const value = useMemo(
    () => ({ showAlert, showConfirm, showActionSheet }),
    [showActionSheet, showAlert, showConfirm],
  );

  const accentColor =
    dialog?.tone === 'danger'
      ? theme.colors.accent
      : dialog?.tone === 'success'
        ? '#22c55e'
        : theme.colors.primary;

  return (
    <DialogContext.Provider value={value}>
      {children}
      <RNModal
        visible={dialog !== null}
        transparent
        animationType="none"
        onRequestClose={() => closeDialog()}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.overlayPressable} onPress={() => closeDialog()}>
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Pressable onPress={(event) => event.stopPropagation()}>
                <View style={styles.iconRow}>
                  <View
                    style={[
                      styles.iconBadge,
                      { backgroundColor: `${accentColor}22`, borderColor: accentColor },
                    ]}
                  >
                    <Ionicons
                      name={
                        dialog?.tone === 'danger'
                          ? 'warning-outline'
                          : dialog?.tone === 'success'
                            ? 'checkmark-circle-outline'
                            : 'information-circle-outline'
                      }
                      size={24}
                      color={accentColor}
                    />
                  </View>
                </View>
                <Text
                  style={[styles.title, { color: theme.colors.text, ...theme.typography.heading }]}
                >
                  {dialog?.title}
                </Text>
                {dialog?.message ? (
                  <ScrollView
                    style={styles.messageScroller}
                    contentContainerStyle={styles.messageContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={[styles.message, { color: theme.colors.muted }]}>
                      {dialog.message}
                    </Text>
                  </ScrollView>
                ) : null}
                {dialog?.showCheckbox && (
                  <View style={styles.checkboxRow}>
                    <Pressable
                      style={[
                        styles.checkbox,
                        { borderColor: theme.colors.border },
                        checked && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      onPress={() => {
                        const nextChecked = !checked;
                        setChecked(nextChecked);
                        dialog.onCheckboxToggle?.(nextChecked);
                      }}
                    >
                      {checked && (
                        <Ionicons name="checkmark" size={14} color={theme.colors.background} />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const nextChecked = !checked;
                        setChecked(nextChecked);
                        dialog.onCheckboxToggle?.(nextChecked);
                      }}
                    >
                      <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                        {dialog.checkboxLabel ?? "Don't show again"}
                      </Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.actions}>
                  {dialog?.actions.map((action) => (
                    <Button
                      key={`${action.label}-${action.value ?? action.label}`}
                      title={action.label}
                      variant={action.variant ?? 'primary'}
                      onPress={() => closeDialog(action.value ?? action.label)}
                      style={styles.actionButton}
                    />
                  ))}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </RNModal>
    </DialogContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 15, 0.86)',
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 44,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: 20,
    maxHeight: '88%',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    textAlign: 'center',
    marginBottom: 10,
  },
  messageScroller: {
    maxHeight: 220,
  },
  messageContent: {
    paddingBottom: 2,
  },
  message: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginTop: 18,
  },
  actionButton: {
    width: '100%',
    minHeight: 52,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
    alignSelf: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
});
