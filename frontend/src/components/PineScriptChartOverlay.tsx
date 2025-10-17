import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';

interface ExecutionResult {
  orders?: Array<{
    time: number;
    type: string;
    direction: string;
    price: number;
    qty: number;
  }>;
  indicators?: Record<string, number[]>;
}

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Props {
  chartData: ChartData[];
  executionResult: ExecutionResult;
  width?: number;
  height?: number;
}

export const PineScriptChartOverlay: React.FC<Props> = ({
  chartData,
  executionResult,
  width = 800,
  height = 400
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (!chartData || chartData.length === 0) return;

    try {
      setError(null);

      // Initialize chart
      const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Set chart data (convert time to Time type)
    const formattedChartData = chartData.map(candle => ({
      ...candle,
      time: candle.time as any, // TradingView accepts unix timestamp
    }));
    candlestickSeries.setData(formattedChartData);

    // Add order markers
    if (executionResult.orders && executionResult.orders.length > 0) {
      const markers = executionResult.orders.map(order => {
        const isLong = order.direction?.toLowerCase() === 'long' || order.type === 'entry';
        return {
          time: order.time,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: isLong ? '#26a69a' : '#ef5350',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: `${order.type} ${order.direction || ''} @ ${order.price?.toFixed(2)}`,
        };
      }) as any[];

      candlestickSeries.setMarkers(markers);
    }

    // Add indicator overlays
    if (executionResult.indicators) {
      Object.entries(executionResult.indicators).forEach(([name, values], index) => {
        if (Array.isArray(values) && values.length === chartData.length) {
          const lineSeries = chart.addLineSeries({
            color: getIndicatorColor(index),
            lineWidth: 2,
            title: name,
          });

          const lineData = chartData.map((candle, i) => ({
            time: candle.time as any, // TradingView accepts unix timestamp
            value: values[i],
          })).filter(d => !isNaN(d.value) && d.value !== null);

          lineSeries.setData(lineData);
        }
      });
    }

      // Fit content
      chart.timeScale().fitContent();

      // Cleanup
      return () => {
        try {
          if (chart) {
            chart.remove();
          }
        } catch (error) {
          console.error('Error removing chart:', error);
        }
      };
    } catch (error) {
      console.error('Error creating chart:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chart');
    }
  }, [chartData, executionResult, width, height]);

  return (
    <div>
      <h3>Strategy Visualization</h3>
      {error && (
        <div style={{ color: 'red', padding: '10px', marginBottom: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          Error: {error}
        </div>
      )}
      <div ref={chartContainerRef} />

      {/* Legend */}
      <div style={{ marginTop: '10px', fontSize: '12px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {executionResult.indicators && Object.keys(executionResult.indicators).map((name, index) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '20px',
                  height: '3px',
                  backgroundColor: getIndicatorColor(index),
                }}
              />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function getIndicatorColor(index: number): string {
  const colors = [
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#4CAF50', // Green
    '#F44336', // Red
    '#00BCD4', // Cyan
    '#FFEB3B', // Yellow
    '#795548', // Brown
  ];
  return colors[index % colors.length];
}
