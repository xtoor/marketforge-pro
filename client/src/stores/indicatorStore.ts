import { create } from 'zustand';

export type IndicatorType = 
  | 'sma' 
  | 'ema' 
  | 'rsi' 
  | 'macd' 
  | 'bollinger_bands'
  | 'stochastic'
  | 'atr'
  | 'adx';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  parameters: Record<string, any>;
  color: string;
  panel: 'main' | 'lower'; // main = overlay on chart, lower = separate panel
  visible: boolean;
}

interface IndicatorState {
  activeIndicators: IndicatorConfig[];
  addIndicator: (indicator: Omit<IndicatorConfig, 'id'>) => void;
  removeIndicator: (id: string) => void;
  updateIndicator: (id: string, updates: Partial<IndicatorConfig>) => void;
  toggleIndicatorVisibility: (id: string) => void;
  clearAllIndicators: () => void;
}

export const useIndicatorStore = create<IndicatorState>((set) => ({
  activeIndicators: [],
  
  addIndicator: (indicator) => set((state) => ({
    activeIndicators: [
      ...state.activeIndicators,
      {
        ...indicator,
        id: `${indicator.type}-${Date.now()}`
      }
    ]
  })),
  
  removeIndicator: (id) => set((state) => ({
    activeIndicators: state.activeIndicators.filter((ind) => ind.id !== id)
  })),
  
  updateIndicator: (id, updates) => set((state) => ({
    activeIndicators: state.activeIndicators.map((ind) =>
      ind.id === id ? { ...ind, ...updates } : ind
    )
  })),
  
  toggleIndicatorVisibility: (id) => set((state) => ({
    activeIndicators: state.activeIndicators.map((ind) =>
      ind.id === id ? { ...ind, visible: !ind.visible } : ind
    )
  })),
  
  clearAllIndicators: () => set({ activeIndicators: [] })
}));
