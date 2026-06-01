import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { WorkoutSessionSchema } from '@fitness-tracker/domain';

/**
 * Smoke test proving the Jest + React Native Testing Library setup works and
 * that the mobile app can consume the shared domain package.
 */

function Greeting({ name }: { name: string }) {
  return (
    <View>
      <Text>Hello, {name}!</Text>
    </View>
  );
}

describe('RNTL setup', () => {
  it('renders a component and finds text', () => {
    render(<Greeting name="Konrad" />);
    expect(screen.getByText('Hello, Konrad!')).toBeOnTheScreen();
  });
});

describe('domain package is importable from the app', () => {
  it('validates a workout session via the shared schema', () => {
    const result = WorkoutSessionSchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      name: 'Leg Day',
      startedAt: new Date(),
      exercises: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(result.success).toBe(true);
  });
});
