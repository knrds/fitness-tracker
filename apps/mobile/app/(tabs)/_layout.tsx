import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarLabel: 'Home' }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Workouts', tabBarLabel: 'Workouts' }}
      />
    </Tabs>
  );
}
