import { create } from 'zustand';

export type DrawingTool = 'none' | 'horizontal' | 'trendline' | 'fibonacci';

export interface HorizontalLine {
  id: string;
  price: number;
  color: string;
  label?: string;
}

export interface TrendLine {
  id: string;
  points: Array<{ time: number; price: number }>;
  color: string;
  label?: string;
}

export interface FibonacciRetracement {
  id: string;
  startPoint: { time: number; price: number };
  endPoint: { time: number; price: number };
  color: string;
}

interface DrawingState {
  activeTool: DrawingTool;
  horizontalLines: HorizontalLine[];
  trendLines: TrendLine[];
  fibonacciRetracements: FibonacciRetracement[];
  
  setActiveTool: (tool: DrawingTool) => void;
  addHorizontalLine: (line: HorizontalLine) => void;
  removeHorizontalLine: (id: string) => void;
  addTrendLine: (line: TrendLine) => void;
  removeTrendLine: (id: string) => void;
  addFibonacciRetracement: (fib: FibonacciRetracement) => void;
  removeFibonacciRetracement: (id: string) => void;
  clearAll: () => void;
}

export const useDrawingStore = create<DrawingState>((set) => ({
  activeTool: 'none',
  horizontalLines: [],
  trendLines: [],
  fibonacciRetracements: [],
  
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  addHorizontalLine: (line) => set((state) => ({
    horizontalLines: [...state.horizontalLines, line],
    activeTool: 'none'
  })),
  
  removeHorizontalLine: (id) => set((state) => ({
    horizontalLines: state.horizontalLines.filter((l) => l.id !== id)
  })),
  
  addTrendLine: (line) => set((state) => ({
    trendLines: [...state.trendLines, line],
    activeTool: 'none'
  })),
  
  removeTrendLine: (id) => set((state) => ({
    trendLines: state.trendLines.filter((l) => l.id !== id)
  })),
  
  addFibonacciRetracement: (fib) => set((state) => ({
    fibonacciRetracements: [...state.fibonacciRetracements, fib],
    activeTool: 'none'
  })),
  
  removeFibonacciRetracement: (id) => set((state) => ({
    fibonacciRetracements: state.fibonacciRetracements.filter((f) => f.id !== id)
  })),
  
  clearAll: () => set({
    horizontalLines: [],
    trendLines: [],
    fibonacciRetracements: [],
    activeTool: 'none'
  })
}));
