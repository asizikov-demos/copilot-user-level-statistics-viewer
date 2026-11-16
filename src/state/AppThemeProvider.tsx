'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { applyChartTheme } from '../components/charts/utils/chartSetup';

type AppTheme = 'light' | 'dimmed';

const STORAGE_KEY = 'copilot-metrics-theme';
const AppThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
} | undefined>(undefined);

function applyDocumentTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.colorMode = theme === 'dimmed' ? 'dark' : 'light';
  root.dataset.lightTheme = 'light';
  root.dataset.darkTheme = 'dark_dimmed';
  root.style.colorScheme = theme === 'dimmed' ? 'dark' : 'light';
  // Canvas builders must read the new root tokens before theme consumers render.
  applyChartTheme({ refresh: true });
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light');

  useEffect(() => {
    let restoredTheme: AppTheme = 'light';
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'dimmed') restoredTheme = 'dimmed';
    } catch (error) {
      console.warn('Unable to read the saved theme preference.', error);
    }
    applyDocumentTheme(restoredTheme);
    setThemeState(restoredTheme);
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    applyDocumentTheme(nextTheme);
    setThemeState(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn('Unable to save the theme preference.', error);
    }
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider colorMode={theme === 'dimmed' ? 'night' : 'day'} dayScheme="light" nightScheme="dark_dimmed">
        <BaseStyles>{children}</BaseStyles>
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider');
  return context;
}
