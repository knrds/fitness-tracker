import React, { createContext, useContext, useMemo } from 'react';
import { Colorway, createTheme, theme, Theme } from './theme';

const ThemeContext = createContext<{ theme: Theme; colorScheme: 'dark' }>({
  theme,
  colorScheme: 'dark',
});
export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeContext = () => useContext(ThemeContext);
export function useThemeStyles<T>(factory: (theme: Theme) => T): T {
  const current = useTheme();
  return useMemo(() => factory(current), [current, factory]);
}
export function ThemeProvider({
  children,
  colorway = 'glacier',
}: {
  children: React.ReactNode;
  colorway?: Colorway | undefined;
}) {
  const value = useMemo(
    () => ({ theme: createTheme(colorway), colorScheme: 'dark' as const }),
    [colorway],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
