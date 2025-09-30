import { useQuery, useQueries } from "@tanstack/react-query";
import { useIndicatorStore } from "@/stores/indicatorStore";
import { useTradingStore } from "@/stores/tradingStore";

export interface IndicatorConfig {
  type: string;
  params: Record<string, string | number>;
  enabled: boolean;
  color?: string;
}

export function useIndicator(
  symbolId: string,
  timeframe: string,
  indicatorType: string,
  params: Record<string, string | number> = {},
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['/api/indicators', symbolId, timeframe, indicatorType, params],
    enabled: enabled && !!symbolId && !!timeframe && !!indicatorType,
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook to fetch all active indicators from the store
export function useActiveIndicators() {
  const { activeIndicators } = useIndicatorStore();
  const { currentSymbol, selectedTimeframe } = useTradingStore();

  // Use useQueries to fetch indicator data for all active indicators
  const indicatorQueries = useQueries({
    queries: activeIndicators.map((indicator) => {
      const params = Object.entries(indicator.parameters).reduce((acc, [key, value]) => {
        acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>);

      // Build query string
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/indicators/${currentSymbol?.id}/${selectedTimeframe}/${indicator.type}${queryString ? `?${queryString}` : ''}`;

      return {
        queryKey: [url, indicator.id],
        queryFn: async () => {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch indicator data');
          return response.json();
        },
        enabled: !!currentSymbol && indicator.visible,
        staleTime: 30000, // 30 seconds
      };
    })
  });

  // Combine indicator configs with their data
  const indicatorsWithData = activeIndicators.map((indicator, index) => ({
    indicator,
    data: indicatorQueries[index]?.data || null,
    isLoading: indicatorQueries[index]?.isLoading || false,
    error: indicatorQueries[index]?.error || null
  }));

  return indicatorsWithData;
}
