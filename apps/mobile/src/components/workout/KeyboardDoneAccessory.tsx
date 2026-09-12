import React from 'react';
import {
  InputAccessoryView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme } from '@fitness-tracker/ui';

export const KEYBOARD_DONE_ID = 'keyboardDoneAccessory';

export const KeyboardDoneAccessory = () => {
  const theme = useTheme();

  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        ]}
      >
        <View style={styles.flexSpacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eingabe fertig"
          onPress={() => Keyboard.dismiss()}
          style={styles.doneButton}
          hitSlop={10}
        >
          <Text style={[styles.doneText, { color: theme.colors.primary }]}>Fertig</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  flexSpacer: {
    flex: 1,
  },
  doneButton: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  doneText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
});
