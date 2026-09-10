import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, useTheme, useDialog } from '@fitness-tracker/ui';
import { useStorageHealth } from '../stores/storageHealth';
import {
  isPersistenceReady,
  retryHydration,
  subscribeToHydration,
} from '../stores/persistenceLifecycle';

export function PersistenceGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { showAlert } = useDialog();
  const writeError = useStorageHealth((state) => state.writeError);
  const blocked = useStorageHealth((state) => state.blockedStores);
  const [ready, setReady] = useState(isPersistenceReady);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  useEffect(() => {
    if (!writeError) return;
    void showAlert({
      title: 'Änderung nicht gespeichert',
      message:
        'Die letzte Eingabe konnte nicht gespeichert werden. Der vorherige Stand bleibt erhalten. Prüfe die Eingabe und den freien Gerätespeicher und versuche es erneut.',
      tone: 'danger',
    }).then(() => useStorageHealth.getState().dismissWriteError());
  }, [writeError, showAlert]);
  useEffect(() => {
    const check = () => setReady(isPersistenceReady());
    const unsubscribe = subscribeToHydration(check);
    check();
    return unsubscribe;
  }, []);
  if (blocked.length === 0 && ready) return <>{children}</>;
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.text }]}
        >
          {blocked.length ? 'Gespeicherte Daten prüfen' : 'Training wird geladen'}
        </Text>
        {blocked.length ? (
          <>
            <Text
              accessibilityRole="alert"
              style={[theme.typography.body, { color: theme.colors.text }]}
            >
              Deine gespeicherten Daten konnten nicht sicher geladen werden. Sie werden nicht
              überschrieben. Bitte lösche oder installiere die App nicht neu.
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
              Du kannst das Laden erneut versuchen. Bleibt der Fehler bestehen, müssen die lokalen
              Daten wiederhergestellt werden, bevor du weitertrainierst.
            </Text>
            <Button
              title="Erneut laden"
              accessibilityLabel="Gespeicherte Daten erneut laden"
              isLoading={retrying}
              style={styles.button}
              onPress={async () => {
                setRetrying(true);
                setRetryError(false);
                try {
                  await retryHydration();
                } catch {
                  setRetryError(true);
                } finally {
                  setRetrying(false);
                }
              }}
            />
            {retryError && (
              <Text accessibilityRole="alert" style={{ color: theme.colors.text }}>
                Das erneute Laden ist fehlgeschlagen. Deine Daten bleiben geschützt.
              </Text>
            )}
          </>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Lade gespeicherte Trainingsdaten"
            color={theme.colors.primary}
          />
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 420, gap: 20 },
  button: { minHeight: 48 },
});
