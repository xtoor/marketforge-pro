import { useQuery, useMutation } from "@tanstack/react-query";
import { useDrawingStore, type HorizontalLine, type TrendLine, type FibonacciRetracement } from "@/stores/drawingStore";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Drawing, InsertDrawing } from "@shared/schema";
import { useEffect, useCallback } from "react";

// Helper to calculate bounding box from drawing points
function calculateBbox(points: Array<{ time: number; price: number }>) {
  const times = points.map(p => p.time);
  const prices = points.map(p => p.price);
  
  return {
    t0: Math.min(...times),
    t1: Math.max(...times),
    pMin: Math.min(...prices),
    pMax: Math.max(...prices)
  };
}

// Transform database drawing to client-side format
function transformDrawingToClient(drawing: Drawing) {
  const points = drawing.points as Array<{ time: number; price: number }>;
  const style = drawing.style as { color: string; width?: number; label?: string; visible?: boolean };
  
  switch (drawing.type) {
    case 'horizontal':
      return {
        type: 'horizontal' as const,
        data: {
          id: drawing.id,
          price: points[0].price,
          color: style.color,
          label: style.label
        } as HorizontalLine
      };
    
    case 'trendline':
      return {
        type: 'trendline' as const,
        data: {
          id: drawing.id,
          points,
          color: style.color,
          label: style.label
        } as TrendLine
      };
    
    case 'fibonacci':
      return {
        type: 'fibonacci' as const,
        data: {
          id: drawing.id,
          startPoint: points[0],
          endPoint: points[1],
          color: style.color
        } as FibonacciRetracement
      };
    
    default:
      return null;
  }
}

export function useDrawings(userId: string, symbolId: string, timeframe: string) {
  const drawingStore = useDrawingStore();
  
  // Load drawings from API
  const { data: drawings = [], isLoading } = useQuery<Drawing[]>({
    queryKey: ['/api/drawings', userId, symbolId, timeframe],
    enabled: !!userId && !!symbolId && !!timeframe
  });

  // Sync API drawings to store on load
  useEffect(() => {
    if (!drawings || drawings.length === 0) return;
    
    const horizontals: HorizontalLine[] = [];
    const trends: TrendLine[] = [];
    const fibs: FibonacciRetracement[] = [];
    
    drawings.forEach(drawing => {
      const transformed = transformDrawingToClient(drawing);
      if (transformed) {
        switch (transformed.type) {
          case 'horizontal':
            horizontals.push(transformed.data);
            break;
          case 'trendline':
            trends.push(transformed.data);
            break;
          case 'fibonacci':
            fibs.push(transformed.data);
            break;
        }
      }
    });
    
    // Update store with loaded drawings
    drawingStore.clearAll();
    horizontals.forEach(h => drawingStore.addHorizontalLine(h));
    trends.forEach(t => drawingStore.addTrendLine(t));
    fibs.forEach(f => drawingStore.addFibonacciRetracement(f));
  }, [drawings]);

  // Create drawing mutation
  const createDrawingMutation = useMutation({
    mutationFn: async (drawingData: InsertDrawing) => {
      const res = await apiRequest('POST', '/api/drawings', drawingData);
      return await res.json() as Drawing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drawings', userId, symbolId, timeframe] });
    }
  });

  // Delete drawing mutation
  const deleteDrawingMutation = useMutation({
    mutationFn: async (drawingId: string) => {
      await apiRequest('DELETE', `/api/drawings/${drawingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drawings', userId, symbolId, timeframe] });
    }
  });

  // Clear all drawings mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = drawings.map(d => 
        apiRequest('DELETE', `/api/drawings/${d.id}`)
      );
      return await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drawings', userId, symbolId, timeframe] });
      drawingStore.clearAll();
    }
  });

  // Save horizontal line to database
  const saveHorizontalLine = useCallback(async (line: HorizontalLine) => {
    // Guard against invalid userId or symbolId
    if (!userId || !symbolId) {
      console.warn('Cannot save drawing: userId or symbolId not set');
      return;
    }
    
    const timestamp = Date.now() / 1000;
    const drawingData: InsertDrawing = {
      userId,
      symbolId,
      timeframe,
      type: 'horizontal',
      points: [{ time: timestamp, price: line.price }],
      style: { color: line.color, label: line.label, visible: true },
      bbox: calculateBbox([{ time: timestamp, price: line.price }])
    };
    
    await createDrawingMutation.mutateAsync(drawingData);
  }, [userId, symbolId, timeframe]);

  // Save trend line to database
  const saveTrendLine = useCallback(async (line: TrendLine) => {
    // Guard against invalid userId or symbolId
    if (!userId || !symbolId) {
      console.warn('Cannot save drawing: userId or symbolId not set');
      return;
    }
    
    const drawingData: InsertDrawing = {
      userId,
      symbolId,
      timeframe,
      type: 'trendline',
      points: line.points,
      style: { color: line.color, width: 2, label: line.label, visible: true },
      bbox: calculateBbox(line.points)
    };
    
    await createDrawingMutation.mutateAsync(drawingData);
  }, [userId, symbolId, timeframe]);

  // Save Fibonacci retracement to database
  const saveFibonacci = useCallback(async (fib: FibonacciRetracement) => {
    // Guard against invalid userId or symbolId
    if (!userId || !symbolId) {
      console.warn('Cannot save drawing: userId or symbolId not set');
      return;
    }
    
    const drawingData: InsertDrawing = {
      userId,
      symbolId,
      timeframe,
      type: 'fibonacci',
      points: [fib.startPoint, fib.endPoint],
      style: { color: fib.color, visible: true },
      bbox: calculateBbox([fib.startPoint, fib.endPoint])
    };
    
    await createDrawingMutation.mutateAsync(drawingData);
  }, [userId, symbolId, timeframe]);

  // Delete drawing from database
  const deleteDrawing = useCallback(async (drawingId: string) => {
    await deleteDrawingMutation.mutateAsync(drawingId);
  }, []);

  // Clear all drawings from database
  const clearAll = useCallback(async () => {
    await clearAllMutation.mutateAsync();
  }, [drawings]);

  return {
    drawings,
    isLoading,
    saveHorizontalLine,
    saveTrendLine,
    saveFibonacci,
    deleteDrawing,
    clearAll,
    isSaving: createDrawingMutation.isPending || deleteDrawingMutation.isPending || clearAllMutation.isPending
  };
}
