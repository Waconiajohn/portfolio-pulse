import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppMode, APP_MODE_CONFIG, MODE_MESSAGING, ModeMessaging } from '@/types/app-mode';

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  config: typeof APP_MODE_CONFIG[AppMode];
  messaging: ModeMessaging;
  isConsumer: boolean;
  isAdvisor: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const MODE_STORAGE_KEY = 'portfolio-app-mode';

interface AppModeProviderProps {
  children: ReactNode;
}

export function AppModeProvider({ children }: AppModeProviderProps) {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if (stored === 'consumer' || stored === 'advisor') {
        return stored;
      }
    }
    return 'consumer';
  });

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  }, []);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  const value: AppModeContextType = {
    mode,
    setMode,
    config: APP_MODE_CONFIG[mode],
    messaging: MODE_MESSAGING[mode],
    isConsumer: mode === 'consumer',
    isAdvisor: mode === 'advisor',
  };

  return (
    <AppModeContext.Provider value={value}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
