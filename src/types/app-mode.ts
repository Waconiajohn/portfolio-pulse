// App Mode Types for Consumer/Advisor dual-mode system

export type AppMode = 'consumer' | 'advisor';

export interface AppModeConfig {
  mode: AppMode;
  label: string;
  description: string;
  emoji: string;
}

export const APP_MODE_CONFIG: Record<AppMode, AppModeConfig> = {
  consumer: {
    mode: 'consumer',
    label: 'Consumer',
    description: 'Personal portfolio analysis with education-focused insights',
    emoji: '👤',
  },
  advisor: {
    mode: 'advisor',
    label: 'Advisor',
    description: 'Professional tools for client portfolio management',
    emoji: '💼',
  },
};

// Consumer vs Advisor messaging intensity
export interface ModeMessaging {
  useEmoji: boolean;
  educationLevel: 'basic' | 'detailed' | 'technical';
  showPeerComparison: boolean;
  showInteractiveCalculators: boolean;
  showClientManagement: boolean;
  showBenchmarkSettings: boolean;
  showComplianceTools: boolean;
}

export const MODE_MESSAGING: Record<AppMode, ModeMessaging> = {
  consumer: {
    useEmoji: true,
    educationLevel: 'detailed',
    showPeerComparison: true,
    showInteractiveCalculators: true,
    showClientManagement: false,
    showBenchmarkSettings: false,
    showComplianceTools: false,
  },
  advisor: {
    useEmoji: false,
    educationLevel: 'technical',
    showPeerComparison: false,
    showInteractiveCalculators: false,
    showClientManagement: true,
    showBenchmarkSettings: true,
    showComplianceTools: true,
  },
};
