import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ColorType, CandlestickSeries, LineSeries } from "lightweight-charts";
import { useMarketData } from "@/hooks/useMarketData";
import { useIndicator } from "@/hooks/useIndicators";
import { useTradingStore } from "@/stores/tradingStore";
import { Button } from "@/components/ui/button";

export interface IndicatorConfig {
  id: string;
  type: string;
  params: Record<string, string | number>;
  enabled: boolean;
  color?: string;
}

interface TradingChartWithIndicatorsProps {
  indicators: IndicatorConfig[];
}

export default function TradingChartWithIndicators({ indicators }: TradingChartWithIndicatorsProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any | null>(null);
  const indicatorSeriesRefs = useRef<Map<string, any>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  const { currentSymbol, selectedTimeframe } = useTradingStore();
  const { candlestickData } = useMarketData(currentSymbol?.symbol || 'BTCUSDT', selectedTimeframe);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    try {
      const container = chartContainerRef.current;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 400;

      if (width === 0 || height === 0) {
        console.warn('Chart container has no dimensions');
        return;
      }

      // Create chart
      const chart = createChart(container, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: 'hsl(222, 84%, 4%)' },
          textColor: 'hsl(210, 40%, 98%)',
        },
        grid: {
          vertLines: { color: 'rgba(59, 130, 246, 0.1)' },
          horzLines: { color: 'rgba(59, 130, 246, 0.1)' },
        },
        rightPriceScale: {
          borderColor: 'hsl(215, 32%, 27%)',
        },
        timeScale: {
          borderColor: 'hsl(215, 32%, 27%)',
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: 'rgba(6, 182, 212, 0.5)',
            width: 1,
            style: 2,
          },
          horzLine: {
            color: 'rgba(6, 182, 212, 0.5)',
            width: 1,
            style: 2,
          },
        },
      });

      // Add candlestick series
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981',
        downColor: '#EF4444',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });

      // Set initial dummy data
      const now = Math.floor(Date.now() / 1000);
      const dummyData = Array.from({ length: 50 }, (_, i) => {
        const open = 43000 + Math.random() * 2000;
        const close = open + (Math.random() - 0.5) * 1000;
        const high = Math.max(open, close) + Math.random() * 500;
        const low = Math.min(open, close) - Math.random() * 500;
        return {
          time: (now - (50 - i) * 3600) as any,
          open,
          high,
          low,
          close
        };
      });
      series.setData(dummyData);

      chartRef.current = chart;
      candlestickSeriesRef.current = series;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    } catch (chartError) {
      console.error('Chart initialization error:', chartError);
      console.error('Error type:', typeof chartError);
      console.error('Error message:', chartError instanceof Error ? chartError.message : 'Unknown');
      console.error('Error stack:', chartError instanceof Error ? chartError.stack : 'No stack');
      setError('Failed to initialize trading chart');
    }
  }, []);

  // Update candlestick data
  useEffect(() => {
    if (candlestickSeriesRef.current && candlestickData.length > 0) {
      try {
        const formattedData = candlestickData.map(candle => ({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close
        }));
        candlestickSeriesRef.current.setData(formattedData);
      } catch (dataError) {
        console.error('Chart data error:', dataError);
      }
    }
  }, [candlestickData]);

  // Manage indicator series
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const currentSeriesIds = new Set(indicators.map(ind => ind.id));
    
    // Remove indicators that are no longer in the list
    indicatorSeriesRefs.current.forEach((series, id) => {
      if (!currentSeriesIds.has(id)) {
        chart.removeSeries(series);
        indicatorSeriesRefs.current.delete(id);
      }
    });

    // Add or update indicators
    indicators.forEach(indicator => {
      if (!indicatorSeriesRefs.current.has(indicator.id) && indicator.enabled) {
        const lineSeries = chart.addSeries(LineSeries, {
          color: indicator.color || '#06B6D4',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        indicatorSeriesRefs.current.set(indicator.id, lineSeries);
      }
    });
  }, [indicators]);

  if (error) {
    return (
      <div className="flex-1 relative flex items-center justify-center bg-card">
        <div className="text-center space-y-4">
          <p className="text-destructive">Chart Error: {error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            data-testid="button-retry"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div ref={chartContainerRef} className="absolute inset-0" data-testid="chart-container" />
      {indicators.map(indicator => (
        <IndicatorDataFetcher
          key={indicator.id}
          indicator={indicator}
          symbolId={currentSymbol?.id || ''}
          timeframe={selectedTimeframe}
          series={indicatorSeriesRefs.current.get(indicator.id)}
          candlestickData={candlestickData}
        />
      ))}
    </div>
  );
}

// Component to fetch and update indicator data
function IndicatorDataFetcher({
  indicator,
  symbolId,
  timeframe,
  series,
  candlestickData
}: {
  indicator: IndicatorConfig;
  symbolId: string;
  timeframe: string;
  series: any;
  candlestickData: any[];
}) {
  const { data: indicatorData } = useIndicator(
    symbolId,
    timeframe,
    indicator.type,
    indicator.params,
    indicator.enabled
  );

  useEffect(() => {
    if (!series || !indicatorData || !candlestickData.length) return;

    try {
      // Map indicator values to chart data format
      const values = indicatorData.values || indicatorData.macd || indicatorData.middle || [];
      
      if (values.length === 0) return;

      const indicatorChartData = candlestickData
        .map((candle, i) => {
          const value = values[i];
          if (value === null || value === undefined || isNaN(value)) return null;
          return {
            time: candle.time,
            value: value
          };
        })
        .filter(d => d !== null);

      if (indicatorChartData.length > 0) {
        series.setData(indicatorChartData);
      }
    } catch (error) {
      console.error('Error updating indicator data:', error);
    }
  }, [indicatorData, series, candlestickData]);

  return null;
}
