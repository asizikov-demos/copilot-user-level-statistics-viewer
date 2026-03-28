"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  ViewMode,
  VIEW_MODES,
  SelectedUser,
  NavigationState,
  NavigationActions,
} from '../types/navigation';

interface NavigationContextValue extends NavigationState, NavigationActions {}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

const initialNavigationState: NavigationState = {
  currentView: VIEW_MODES.OVERVIEW,
  selectedUser: null,
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NavigationState>(initialNavigationState);

  const navigateTo = useCallback((view: ViewMode) => {
    setState((prev) => ({
      ...prev,
      currentView: view,
    }));
  }, []);

  const selectUser = useCallback((user: SelectedUser) => {
    setState((prev) => ({
      ...prev,
      selectedUser: user,
      currentView: VIEW_MODES.USER_DETAILS,
    }));
  }, []);

  const resetNavigation = useCallback(() => {
    setState(initialNavigationState);
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      ...state,
      navigateTo,
      selectUser,
      resetNavigation,
    }),
    [state, navigateTo, selectUser, resetNavigation]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return ctx;
}
