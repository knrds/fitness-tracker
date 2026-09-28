import { Theme, withAlpha } from './theme';
import { ViewStyle } from 'react-native';

export function calendarVisual(
  theme: Theme,
  {
    count,
    selected,
    today,
    record = false,
  }: { count: number; selected: boolean; today: boolean; record?: boolean },
): ViewStyle {
  const spec = theme.premium;
  if (!spec) return {};
  const active = count > 0;
  return {
    borderRadius:
      spec.calendarVariant === 'coffee-ring' || spec.calendarVariant === 'blossom' ? 22 : 12,
    borderWidth: record || selected || today ? 2 : 1,
    borderColor:
      record || selected
        ? spec.highlight
        : today
          ? theme.colors.text
          : active
            ? withAlpha(spec.highlight, 0.6)
            : theme.colors.border,
    backgroundColor: active
      ? withAlpha(theme.colors.primary, spec.calendarVariant === 'blossom' ? 0.15 : 0.22)
      : theme.colors.surface,
    ...(spec.calendarVariant === 'halo' && active
      ? {
          shadowColor: spec.highlight,
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 2,
        }
      : {}),
  };
}
