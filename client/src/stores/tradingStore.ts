import { create } from 'zustand';
import type { Symbol } from '@shared/schema';

interface TradingState {
  currentSymbol: Symbol | null;
  selectedTimeframe: string;
  selectedChartType: string;
  isDrawingMode: boolean;
  
  setCurrentSymbol: (symbol: Symbol) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  setSelectedChartType: (chartType: string) => void;
  setDrawingMode: (isDrawing: boolean) => void;
}

export const useTradingStore = create<TradingState>((set) => ({
  currentSymbol: null,
  selectedTimeframe: '1h',
  selectedChartType: 'Candlestick',
  isDrawingMode: false,
  
  setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  setSelectedChartType: (chartType) => set({ selectedChartType: chartType }),
  setDrawingMode: (isDrawing) => set({ isDrawingMode: isDrawing }),
}));
