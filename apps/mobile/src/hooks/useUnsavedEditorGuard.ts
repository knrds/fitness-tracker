import { useRef } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useDialog } from '@fitness-tracker/ui';
import { getStorageScope, isScopeCurrent } from '../data/storageScope';

/** Covers buttons, Android Back and native stack edge gestures through one decision. */
export function useUnsavedEditorGuard(dirty: boolean, language: 'de' | 'en') {
  const navigation = useNavigation();
  const { showConfirm } = useDialog();
  const permitted = useRef(false);
  const pending = useRef(false);
  const allowLeave = (leave: () => void) => { permitted.current = true; leave(); };
  const requestLeave = async (leave: () => void) => {
    if (permitted.current || !dirty) { leave(); return; }
    if (pending.current) return;
    pending.current = true;
    const scope = getStorageScope();
    try {
      const confirmed = await showConfirm({
        title: language === 'de' ? 'Bearbeitung verwerfen?' : 'Discard changes?',
        message: language === 'de' ? 'Nicht gespeicherte Änderungen gehen verloren.' : 'Unsaved changes will be lost.',
        confirmLabel: language === 'de' ? 'Verwerfen' : 'Discard',
        cancelLabel: language === 'de' ? 'Weiter bearbeiten' : 'Keep editing', destructive: true,
      });
      if (confirmed && isScopeCurrent(scope)) allowLeave(leave);
    } finally { pending.current = false; }
  };
  usePreventRemove(dirty, ({ data }) => { void requestLeave(() => navigation.dispatch(data.action)); });
  return { requestLeave, allowLeave };
}
