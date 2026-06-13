import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { theme, Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  colorScheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue>({
  theme,
  colorScheme: 'dark',
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context.theme;
};

export const useThemeContext = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We use system color scheme, but the PRD specifies a dark mode focus for Volt Performance.
  // We'll expose the system scheme, but default the theme tokens to the single Dark spec for now.
  const systemColorScheme = useColorScheme();
  const colorScheme: 'light' | 'dark' = systemColorScheme === 'light' ? 'light' : 'dark';

  const value = useMemo(
    () => ({
      theme, // We use the imported theme which currently maps to the PRD dark spec.
      colorScheme,
    }),
    [colorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
