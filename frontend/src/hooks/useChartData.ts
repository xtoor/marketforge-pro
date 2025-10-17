/**
 * useChartData Hook
 *
 * React Query hook for fetching chart data from backend
 * Handles:
 * - Data fetching with automatic retries
 * - Caching and revalidation
 * - Real-time WebSocket updates (TODO)
 */

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

interface ChartDataParams {
  symbol: string;
  timeframe: string;
  source: string;
  includeAlerts: boolean;
  includeML: boolean;
}

interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartMarker {
  time: number;
  position: string;
  color: string;
  shape: string;
  text: string;
}

interface ChartDataResponse {
  symbol: string;
  timeframe: string;
  candles: OHLCVCandle[];
  markers: ChartMarker[] | null;
  indicators: Record<string, unknown> | null;
  source: string;
}

export const useChartData = ({
  symbol,
  timeframe,
  source,
  includeAlerts,
  includeML,
}: ChartDataParams) => {
  return useQuery<ChartDataResponse>({
    queryKey: ['chartData', symbol, timeframe, source, includeAlerts, includeML],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/chart/data/${symbol}`, {
        params: {
          timeframe,
          source,
          include_alerts: includeAlerts,
          include_ml: includeML,
        },
      });

      return response.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
