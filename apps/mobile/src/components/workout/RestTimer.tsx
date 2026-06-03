import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useWorkoutStore } from '../../stores/workoutStore';
import { Audio } from 'expo-av';

export const RestTimer = () => {
  const { restTimer, startRestTimer, stopRestTimer, tickRestTimer, resetRestTimer } = useWorkoutStore();
  const [timeLeft, setTimeLeft] = useState(restTimer.durationSeconds);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSound = async () => {
      try {
        // Attempt to load a system or local sound if available, otherwise fallback.
        // We catch errors so the app doesn't crash if there's no audio file.
        // const { sound } = await Audio.Sound.createAsync(require('../../../assets/beep.mp3'));
        // soundRef.current = sound;
      } catch (e) {
        console.warn('Could not load sound', e);
      }
    };
    loadSound();
    
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (restTimer.isRunning && restTimer.endsAt) {
      const endsAt = restTimer.endsAt;
      interval = setInterval(() => {
        tickRestTimer();
        const now = new Date();
        const remaining = Math.ceil((endsAt.getTime() - now.getTime()) / 1000);
        
        if (remaining <= 0) {
          setTimeLeft(0);
          // Play sound
          if (soundRef.current) {
            soundRef.current.playAsync();
          } else {
            console.log('Beep! Timer done.');
          }
        } else {
          setTimeLeft(remaining);
        }
      }, 250);
    } else {
      setTimeLeft(restTimer.durationSeconds);
    }
    
    return () => clearInterval(interval);
  }, [restTimer.isRunning, restTimer.endsAt, restTimer.durationSeconds, tickRestTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container} testID="rest-timer-container">
      <Text style={styles.timerText}>{formatTime(Math.max(0, timeLeft))}</Text>
      <View style={styles.controls}>
        {restTimer.isRunning ? (
          <Pressable style={styles.button} onPress={stopRestTimer} testID="stop-timer-btn">
            <Text style={styles.buttonText}>Pause</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.button} onPress={() => startRestTimer(timeLeft || 90)} testID="start-timer-btn">
            <Text style={styles.buttonText}>Start</Text>
          </Pressable>
        )}
        <Pressable style={styles.button} onPress={() => startRestTimer(Math.max(0, timeLeft - 10))}>
          <Text style={styles.buttonText}>-10s</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => startRestTimer(timeLeft + 30)}>
          <Text style={styles.buttonText}>+30s</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.resetButton]} onPress={resetRestTimer} testID="reset-timer-btn">
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
