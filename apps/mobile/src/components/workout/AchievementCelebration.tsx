import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAchievementStore } from '../../stores/achievementStore';
import { ACHIEVEMENTS } from '@fitness-tracker/domain';
import { Ionicons } from '@expo/vector-icons';

export const AchievementCelebration = () => {
  const { newlyUnlocked, levelUpTo, clearCelebrations } = useAchievementStore();

  const isVisible = newlyUnlocked.length > 0 || levelUpTo !== null;

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="fade"
      transparent={true}
      onRequestClose={clearCelebrations}
    >
      <View style={styles.overlay}>
        <View style={styles.celebrationCard}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Level Up Celebration */}
            {levelUpTo !== null && (
              <View style={styles.levelUpContainer}>
                <View style={styles.levelBadge}>
                  <Ionicons name="sparkles" size={48} color="#eab308" />
                </View>
                <Text style={styles.title}>LEVEL UP!</Text>
                <Text style={styles.subtitle}>You reached Level {levelUpTo}</Text>
                <Text style={styles.desc}>Your dedication is paying off. Keep crushing it!</Text>
              </View>
            )}

            {/* Divider if both Level Up and Achievements unlocked */}
            {levelUpTo !== null && newlyUnlocked.length > 0 && (
              <View style={styles.divider} />
            )}

            {/* Achievement Unlocked Celebration */}
            {newlyUnlocked.length > 0 && (
              <View style={styles.achievementsContainer}>
                <Text style={styles.title}>ACHIEVEMENT UNLOCKED!</Text>
                {newlyUnlocked.map(id => {
                  const ach = ACHIEVEMENTS.find(a => a.id === id);
                  if (!ach) return null;
                  return (
                    <View key={id} style={styles.achCard}>
                      <View style={styles.achIconContainer}>
                        <Ionicons name={ach.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color="#eab308" />
                      </View>
                      <View style={styles.achInfo}>
                        <Text style={styles.achName}>{ach.name}</Text>
                        <Text style={styles.achDesc}>{ach.description}</Text>
                        <Text style={styles.achReward}>+{ach.xpReward} XP Reward</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <Pressable style={styles.button} onPress={clearCelebrations}>
              <Text style={styles.buttonText}>Awesome!</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  celebrationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  scrollContent: {
    alignItems: 'center',
  },
  levelUpContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  levelBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fef9c3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    width: '90%',
    marginVertical: 20,
  },
  achievementsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  achCard: {
    flexDirection: 'row',
    backgroundColor: '#fefce8',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  achIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef9c3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achInfo: {
    flex: 1,
  },
  achName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  achDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  achReward: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ca8a04',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
