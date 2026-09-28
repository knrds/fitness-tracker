import React, { useEffect, useState } from 'react';
import { Modal, ModalProps, StyleSheet, View } from 'react-native';
import { WorkoutCelebrationOverlay } from './WorkoutCelebrationOverlay';

/** Native modals own a separate window: their celebration must share that window. */
export function CelebrationModal({ children, onShow, visible = true, ...props }: ModalProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!visible) setShown(false);
  }, [visible]);

  return (
    <Modal
      {...props}
      visible={visible}
      onShow={(event) => {
        setShown(true);
        onShow?.(event);
      }}
    >
      <View testID="celebration-modal-viewport" style={styles.viewport}>
        {children}
        {/* Start after presentation and draw above the card, without blocking its controls. */}
        {shown && visible && <WorkoutCelebrationOverlay />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
});
