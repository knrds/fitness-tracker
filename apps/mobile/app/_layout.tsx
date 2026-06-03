import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AchievementCelebration } from '../src/components/workout/AchievementCelebration';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <AchievementCelebration />
    </>
  );
}
