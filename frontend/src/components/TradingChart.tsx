/**
 * TradingChart Component
 *
 * Integrates TradingView lightweight-charts library for high-fidelity candlestick rendering
 * Features:
 * - Real-time OHLCV updates
 * - Resonance.ai alert markers
 * - ML prediction overlays
 * - Multi-broker data source switching
 *
 * Architecture:
 * - Uses lightweight-charts core (sourced from TradingView repo)
 * - Backend data fetched via unified chart API
 * - WebSocket subscriptions for live updates
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  MouseEventParams,
  LineStyle
} from 'lightweight-charts';
import { useChartData } from '../hooks/useChartData';
import { ChartControls } from './ChartControls';
import { DrawingToolbar } from './DrawingToolbar';
import { DrawingManager, DrawingType } from '../utils/DrawingManager';
import { NewsSidebar } from './NewsSidebar';
import axios from 'axios';

const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

interface TradingChartProps {
  symbol: string;
  timeframe?: string;
  source?: string;
  enableAlerts?: boolean;
  enableML?: boolean;
  theme?: 'light' | 'dark';
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface IndicatorState {
  sma20: boolean;
  sma50: boolean;
  ema20: boolean;
  volume: boolean;
  bollingerBands: boolean;
  rsi: boolean;
  macd: boolean;
}

type DrawingMode = 'horizontal' | 'vertical' | 'trendline' | null;

// Technical indicator calculation utilities
const calculateSMA = (data: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
};

const calculateEMA = (data: number[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(firstSMA);

  // Calculate rest using EMA formula
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }

  return ema;
};

const calculateBollingerBands = (prices: number[], period: number, stdDev: number) => {
  const sma = calculateSMA(prices, period);
  const bands = sma.map((avg, i) => {
    const slice = prices.slice(i, i + period);
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / period;
    const sd = Math.sqrt(variance);
    return {
      upper: avg + (stdDev * sd),
      middle: avg,
      lower: avg - (stdDev * sd)
    };
  });
  return bands;
};

const calculateRSI = (prices: number[], period: number = 14): number[] => {
  const rsi: number[] = [];
  const changes: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Calculate RSI
  for (let i = period; i < changes.length; i++) {
    const slice = changes.slice(i - period, i);
    const gains = slice.filter(c => c > 0).reduce((sum, c) => sum + c, 0) / period;
    const losses = Math.abs(slice.filter(c => c < 0).reduce((sum, c) => sum + c, 0)) / period;

    if (losses === 0) {
      rsi.push(100);
    } else {
      const rs = gains / losses;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
};

const calculateMACD = (prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) => {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // MACD line = fast EMA - slow EMA
  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;

  for (let i = 0; i < fastEMA.length - startIndex; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
  }

  // Signal line = EMA of MACD line
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Histogram = MACD - Signal
  const histogram: number[] = [];
  const signalStart = signalPeriod - 1;

  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalStart] - signalLine[i]);
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
    offset: slowPeriod + signalPeriod - 2
  };
};

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  timeframe = '1h',
  source = 'coingecko',
  enableAlerts = true,
  enableML = false,
  theme = 'dark'
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const drawingManagerRef = useRef<DrawingManager | null>(null);

  const [currentTimeframe, setCurrentTimeframe] = useState(timeframe);
  const [currentSource, setCurrentSource] = useState(source);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingType | null>(null);
  const [drawingsCount, setDrawingsCount] = useState(0);
  const [indicators, setIndicators] = useState<IndicatorState>({
    sma20: false,
    sma50: false,
    ema20: false,
    volume: true, // Enable volume by default
    bollingerBands: false,
    rsi: false,
    macd: false,
  });
  const [strategySignals, setStrategySignals] = useState<any[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<any | null>(null);
  const [newsSidebarOpen, setNewsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch chart data from backend
  const { data, isLoading, error } = useChartData({
    symbol,
    timeframe: currentTimeframe,
    source: currentSource,
    includeAlerts: enableAlerts,
    includeML: enableML
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: theme === 'dark' ? '#1e222d' : '#ffffff' },
        textColor: theme === 'dark' ? '#d1d4dc' : '#191919',
      },
      watermark: {
        visible: true,
        fontSize: 64,
        horzAlign: 'center',
        vertAlign: 'center',
        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        text: 'MarketForge Pro',
      },
      grid: {
        vertLines: {
          color: theme === 'dark' ? '#2b2b43' : '#e1e1e1',
          style: 2, // LineStyle.Dashed
          visible: true,
        },
        horzLines: {
          color: theme === 'dark' ? '#363C4E' : '#e1e1e1',
          style: 0, // LineStyle.Solid
          visible: true,
        },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          width: 1,
          color: theme === 'dark' ? '#758696' : '#9598A1',
          style: 2, // LineStyle.Dashed
          labelBackgroundColor: theme === 'dark' ? '#2b2b43' : '#e1e1e1',
        },
        horzLine: {
          width: 1,
          color: theme === 'dark' ? '#758696' : '#9598A1',
          style: 2, // LineStyle.Dashed
          labelBackgroundColor: theme === 'dark' ? '#2b2b43' : '#e1e1e1',
        },
      },
      rightPriceScale: {
        borderColor: theme === 'dark' ? '#2b2b43' : '#e1e1e1',
        autoScale: true,
      },
      timeScale: {
        borderColor: theme === 'dark' ? '#2b2b43' : '#e1e1e1',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Initialize DrawingManager with primitives API
    drawingManagerRef.current = new DrawingManager(
      chart,
      candlestickSeries,
      symbol
    );
    setDrawingsCount(drawingManagerRef.current.getAllDrawings().length);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [theme]);

  // Control chart panning based on drawing mode
  useEffect(() => {
    if (!chartRef.current) return;

    // Disable panning when in drawing mode, enable when cursor mode is active
    chartRef.current.applyOptions({
      handleScroll: activeDrawingTool === null,
      handleScale: activeDrawingTool === null,
    });
  }, [activeDrawingTool]);

  // Update chart data with volume and indicators
  useEffect(() => {
    if (!data || !candlestickSeriesRef.current || !chartRef.current) return;

    const chart = chartRef.current;

    // Set candlestick data
    const formattedCandles: CandlestickData[] = data.candles.map(candle => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeriesRef.current.setData(formattedCandles);

    // Add volume overlay
    if (indicators.volume && data.candles.length > 0) {
      if (!volumeSeriesRef.current) {
        volumeSeriesRef.current = chart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });
      }

      const volumeData = data.candles.map(candle => ({
        time: candle.time as Time,
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
      }));

      volumeSeriesRef.current.setData(volumeData);
    } else if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    // Calculate and add technical indicators
    const closePrices = data.candles.map(c => c.close);

    // Clear existing indicators
    indicatorSeriesRefs.current.forEach(series => chart.removeSeries(series));
    indicatorSeriesRefs.current.clear();

    // SMA 20
    if (indicators.sma20 && closePrices.length >= 20) {
      const sma20 = calculateSMA(closePrices, 20);
      const sma20Series = chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        title: 'SMA 20',
      });
      sma20Series.setData(sma20.map((value, i) => ({
        time: data.candles[i + 19].time as Time,
        value
      })));
      indicatorSeriesRefs.current.set('sma20', sma20Series);
    }

    // SMA 50
    if (indicators.sma50 && closePrices.length >= 50) {
      const sma50 = calculateSMA(closePrices, 50);
      const sma50Series = chart.addLineSeries({
        color: '#FF9800',
        lineWidth: 2,
        title: 'SMA 50',
      });
      sma50Series.setData(sma50.map((value, i) => ({
        time: data.candles[i + 49].time as Time,
        value
      })));
      indicatorSeriesRefs.current.set('sma50', sma50Series);
    }

    // EMA 20
    if (indicators.ema20 && closePrices.length >= 20) {
      const ema20 = calculateEMA(closePrices, 20);
      const ema20Series = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 2,
        title: 'EMA 20',
      });
      ema20Series.setData(ema20.map((value, i) => ({
        time: data.candles[i + 19].time as Time,
        value
      })));
      indicatorSeriesRefs.current.set('ema20', ema20Series);
    }

    // Bollinger Bands
    if (indicators.bollingerBands && closePrices.length >= 20) {
      const bands = calculateBollingerBands(closePrices, 20, 2);

      const upperBandSeries = chart.addLineSeries({
        color: '#f23645',
        lineWidth: 1,
        title: 'BB Upper',
      });
      upperBandSeries.setData(bands.map((band, i) => ({
        time: data.candles[i + 19].time as Time,
        value: band.upper
      })));
      indicatorSeriesRefs.current.set('bbUpper', upperBandSeries);

      const middleBandSeries = chart.addLineSeries({
        color: '#888888',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Middle',
      });
      middleBandSeries.setData(bands.map((band, i) => ({
        time: data.candles[i + 19].time as Time,
        value: band.middle
      })));
      indicatorSeriesRefs.current.set('bbMiddle', middleBandSeries);

      const lowerBandSeries = chart.addLineSeries({
        color: '#089981',
        lineWidth: 1,
        title: 'BB Lower',
      });
      lowerBandSeries.setData(bands.map((band, i) => ({
        time: data.candles[i + 19].time as Time,
        value: band.lower
      })));
      indicatorSeriesRefs.current.set('bbLower', lowerBandSeries);
    }

    // RSI Indicator
    if (indicators.rsi && closePrices.length >= 14) {
      const rsiValues = calculateRSI(closePrices, 14);
      const rsiSeries = chart.addLineSeries({
        color: '#9C27B0',
        lineWidth: 2,
        title: 'RSI',
        priceScaleId: 'rsi',
      });

      // Configure RSI price scale (0-100 range)
      chart.priceScale('rsi').applyOptions({
        scaleMargins: {
          top: 0.85,
          bottom: 0,
        },
      });

      rsiSeries.setData(rsiValues.map((value, i) => ({
        time: data.candles[i + 14].time as Time,
        value
      })));
      indicatorSeriesRefs.current.set('rsi', rsiSeries);

      // Add RSI overbought/oversold lines
      rsiSeries.createPriceLine({
        price: 70,
        color: '#ef5350',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: 'Overbought',
      });

      rsiSeries.createPriceLine({
        price: 30,
        color: '#26a69a',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: 'Oversold',
      });
    }

    // MACD Indicator
    if (indicators.macd && closePrices.length >= 35) {
      const macdData = calculateMACD(closePrices, 12, 26, 9);

      // Calculate proper starting index in candles array
      // MACD calculation needs slowPeriod + signalPeriod - 2 candles before first data point
      const startIndex = macdData.offset;

      // Validate we have enough candles
      if (startIndex + macdData.histogram.length > data.candles.length) {
        console.warn('Not enough candles for MACD display');
        return;
      }

      // MACD Line
      const macdLineSeries = chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        title: 'MACD',
        priceScaleId: 'macd',
      });

      // Configure MACD price scale
      chart.priceScale('macd').applyOptions({
        scaleMargins: {
          top: 0.92,
          bottom: 0,
        },
      });

      // Map MACD line data with proper alignment
      const macdLineData = macdData.macd
        .map((value, i) => {
          const candleIndex = i + startIndex;
          if (candleIndex >= data.candles.length) return null;
          return {
            time: data.candles[candleIndex].time as Time,
            value
          };
        })
        .filter((item): item is { time: Time; value: number } => item !== null);

      macdLineSeries.setData(macdLineData);
      indicatorSeriesRefs.current.set('macd', macdLineSeries);

      // Signal Line
      const signalLineSeries = chart.addLineSeries({
        color: '#FF9800',
        lineWidth: 2,
        title: 'Signal',
        priceScaleId: 'macd',
      });

      const signalLineData = macdData.signal
        .map((value, i) => {
          const candleIndex = i + startIndex;
          if (candleIndex >= data.candles.length) return null;
          return {
            time: data.candles[candleIndex].time as Time,
            value
          };
        })
        .filter((item): item is { time: Time; value: number } => item !== null);

      signalLineSeries.setData(signalLineData);
      indicatorSeriesRefs.current.set('macd_signal', signalLineSeries);

      // Histogram
      const histogramSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'price',
        },
        priceScaleId: 'macd',
      });

      const histogramData = macdData.histogram
        .map((value, i) => {
          const candleIndex = i + startIndex;
          if (candleIndex >= data.candles.length) return null;
          return {
            time: data.candles[candleIndex].time as Time,
            value,
            color: value >= 0 ? '#26a69a80' : '#ef535080',
          };
        })
        .filter((item): item is { time: Time; value: number; color: string } => item !== null);

      histogramSeries.setData(histogramData);
      // Note: histogram is a different series type, stored separately
    }

    // Add markers (Resonance.ai alerts + strategy signals)
    if (candlestickSeriesRef.current) {
      const allMarkers: any[] = [];
      const resonanceTimestamps = new Set<number>();

      // Add Resonance alerts
      if (data.markers && data.markers.length > 0) {
        data.markers.forEach(marker => {
          const timeValue = typeof marker.time === 'number' ? marker.time : (marker.time as any).valueOf();
          resonanceTimestamps.add(timeValue);

          allMarkers.push({
            time: marker.time as Time,
            position: (marker.position === 'aboveBar' ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
            color: marker.color,
            shape: marker.shape as 'circle' | 'square' | 'arrowUp' | 'arrowDown',
            text: marker.text,
          });
        });
      }

      // Add strategy signals with smart positioning to avoid overlap
      if (strategySignals && strategySignals.length > 0) {
        strategySignals.forEach(signal => {
          const timeValue = typeof signal.time === 'number' ? signal.time : (signal.time as any).valueOf();
          const hasResonanceSignal = resonanceTimestamps.has(timeValue);

          // If there's a Resonance signal at the same time, invert the position
          let position = signal.position === 'aboveBar' ? 'aboveBar' : 'belowBar';
          if (hasResonanceSignal) {
            // Invert position to avoid overlap
            position = position === 'aboveBar' ? 'belowBar' : 'aboveBar';
          }

          allMarkers.push({
            time: signal.time as Time,
            position: position as 'aboveBar' | 'belowBar',
            color: signal.color,
            shape: signal.shape as 'circle' | 'square' | 'arrowUp' | 'arrowDown',
            text: signal.text,
          });
        });
      }

      if (allMarkers.length > 0) {
        // Sort markers by time in ascending order (required by TradingView)
        allMarkers.sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : (a.time as any).valueOf() as number;
          const timeB = typeof b.time === 'number' ? b.time : (b.time as any).valueOf() as number;
          return timeA - timeB;
        });
        candlestickSeriesRef.current.setMarkers(allMarkers);
      }
    }

    // Add ML predictions
    if (enableML && data.indicators) {
      // ML prediction line
      const mlPred = data.indicators.ml_prediction as any;
      if (mlPred) {
        const mlSeries = chart.addLineSeries({
          color: mlPred.color || '#ff9800',
          lineWidth: mlPred.lineWidth || 2,
          lineStyle: LineStyle.Dashed,
          title: mlPred.title || 'ML Prediction',
        });
        mlSeries.setData(mlPred.data.map((d: { time: number; value: number }) => ({
          time: d.time as Time,
          value: d.value
        })));
        indicatorSeriesRefs.current.set('ml_prediction', mlSeries);
      }

      // Upper confidence band
      const upperConf = data.indicators.confidence_upper as any;
      if (upperConf) {
        const upperConfSeries = chart.addLineSeries({
          color: upperConf.color || '#ff980060',
          lineWidth: upperConf.lineWidth || 1,
          lineStyle: LineStyle.Dotted,
          title: upperConf.title || 'Upper Confidence',
        });
        upperConfSeries.setData(upperConf.data.map((d: { time: number; value: number }) => ({
          time: d.time as Time,
          value: d.value
        })));
        indicatorSeriesRefs.current.set('confidence_upper', upperConfSeries);
      }

      // Lower confidence band
      const lowerConf = data.indicators.confidence_lower as any;
      if (lowerConf) {
        const lowerConfSeries = chart.addLineSeries({
          color: lowerConf.color || '#ff980060',
          lineWidth: lowerConf.lineWidth || 1,
          lineStyle: LineStyle.Dotted,
          title: lowerConf.title || 'Lower Confidence',
        });
        lowerConfSeries.setData(lowerConf.data.map((d: { time: number; value: number }) => ({
          time: d.time as Time,
          value: d.value
        })));
        indicatorSeriesRefs.current.set('confidence_lower', lowerConfSeries);
      }
    }

    // Refresh drawings after data update to prevent stacking
    if (drawingManagerRef.current) {
      drawingManagerRef.current.refreshDrawings();
    }

    // Fit content
    chart.timeScale().fitContent();
  }, [data, indicators, enableML, strategySignals]);

  // Handle chart click for drawing tools
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || !drawingManagerRef.current) return;

    const handleClick = (param: MouseEventParams) => {
      if (!activeDrawingTool || !param.time) return;

      // Get price from crosshair position
      let price: number | undefined;

      // Try to get price from seriesPrices first (more accurate)
      const seriesPrices = (param as any).seriesPrices;
      if (seriesPrices && candlestickSeriesRef.current) {
        price = seriesPrices.get(candlestickSeriesRef.current) as number;
      }

      // Fallback to using coordinateToPrice if seriesPrices not available
      if (!price && param.point && candlestickSeriesRef.current) {
        const coordinate = param.point.y;
        if (coordinate !== undefined) {
          const coordinatePrice = candlestickSeriesRef.current.coordinateToPrice(coordinate);
          price = coordinatePrice !== null ? coordinatePrice : undefined;
        }
      }

      if (!price || !drawingManagerRef.current) {
        console.warn('Drawing tool: Could not determine price from click', { param, price });
        return;
      }

      const point = { time: param.time, price };

      console.log('Drawing tool click:', { tool: activeDrawingTool, point });

      // Special handling for text annotations
      if (activeDrawingTool === 'text') {
        const text = prompt('Enter annotation text:');
        if (text) {
          drawingManagerRef.current.startDrawing(activeDrawingTool, point, text);
          drawingManagerRef.current.addPoint(point); // Complete immediately
          setActiveDrawingTool(null);
          setDrawingsCount(drawingManagerRef.current.getAllDrawings().length);
        }
        return;
      }

      // Check if this is a new drawing or continuing an existing one
      const currentDrawing = drawingManagerRef.current.getCurrentDrawing();

      if (!currentDrawing) {
        // Start new drawing
        drawingManagerRef.current.startDrawing(activeDrawingTool, point);
      } else {
        // Add point to existing drawing
        const isComplete = drawingManagerRef.current.addPoint(point);

        if (isComplete) {
          // Drawing is complete, exit drawing mode
          setActiveDrawingTool(null);
          setDrawingsCount(drawingManagerRef.current.getAllDrawings().length);
        }
      }
    };

    chartRef.current.subscribeClick(handleClick);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeClick(handleClick);
      }
    };
  }, [activeDrawingTool, candlestickSeriesRef.current]);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Close context menu when clicking elsewhere
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  useEffect(() => {
    if (contextMenu.visible) {
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, [contextMenu.visible]);

  // Handle indicator toggle
  const toggleIndicator = (indicator: keyof IndicatorState) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  // Handle drawing tool selection
  const handleDrawingTool = (mode: DrawingMode) => {
    setDrawingMode(mode);
    closeContextMenu();
  };

  // Clear all drawings
  const clearAllDrawings = () => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.clearAll();
      setDrawingsCount(0);
    }
    closeContextMenu();
  };

  // Handle drawing tool selection
  const handleSelectDrawingTool = (tool: DrawingType | null) => {
    if (tool && drawingManagerRef.current) {
      // Cancel any pending drawing first
      drawingManagerRef.current.cancelDrawing();
    }
    setActiveDrawingTool(tool);
  };

  // Export drawings
  const handleExportDrawings = () => {
    if (!drawingManagerRef.current) return;

    const json = drawingManagerRef.current.exportDrawings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drawings-${symbol}-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import drawings
  const handleImportDrawings = () => {
    // This will be triggered by file input in DrawingToolbar
    // The actual import logic is in DrawingManager
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: string) => {
    setCurrentTimeframe(newTimeframe);
  };

  // Handle source change
  const handleSourceChange = (newSource: string) => {
    setCurrentSource(newSource);
  };

  // Handle strategy selection
  const handleStrategySelect = async (strategy: any) => {
    if (!strategy) {
      // Deactivate strategy
      setActiveStrategy(null);
      setStrategySignals([]);
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/strategy/execute`,
        {
          strategy_code: strategy.code,
          symbol,
          timeframe: currentTimeframe
        },
        { timeout: 30000 }
      );

      setActiveStrategy(strategy);
      setStrategySignals(response.data.signals || []);
    } catch (err: any) {
      console.error('Strategy execution failed:', err);
      setActiveStrategy(null);
      setStrategySignals([]);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Export screenshot
  const exportScreenshot = () => {
    if (!chartRef.current) return;

    const canvas = chartRef.current.takeScreenshot();
    const link = document.createElement('a');
    link.download = `chart-${symbol}-${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Time range controls
  const setTimeRange = (range: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL') => {
    if (!chartRef.current) return;

    const timeScale = chartRef.current.timeScale();

    switch (range) {
      case '1D':
        timeScale.setVisibleLogicalRange({ from: data!.candles.length - 24, to: data!.candles.length });
        break;
      case '1W':
        timeScale.setVisibleLogicalRange({ from: data!.candles.length - 168, to: data!.candles.length });
        break;
      case '1M':
        timeScale.setVisibleLogicalRange({ from: data!.candles.length - 720, to: data!.candles.length });
        break;
      case '3M':
        timeScale.setVisibleLogicalRange({ from: data!.candles.length - 2160, to: data!.candles.length });
        break;
      case '1Y':
        timeScale.setVisibleLogicalRange({ from: data!.candles.length - 8760, to: data!.candles.length });
        break;
      case 'ALL':
        timeScale.fitContent();
        break;
    }
  };

  if (error) {
    return (
      <div className="chart-error">
        <h3>Chart Error</h3>
        <p>{error.message}</p>
        <p>Trying fallback data source...</p>
      </div>
    );
  }

  return (
    <div className="trading-chart-container" style={{
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      right: isFullscreen ? 0 : 'auto',
      bottom: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      background: theme === 'dark' ? '#1e222d' : '#ffffff',
      minHeight: '100vh'
    }}>
      {/* News Sidebar - hidden in fullscreen */}
      {!isFullscreen && <NewsSidebar theme={theme} onToggle={setNewsSidebarOpen} />}

      {/* Main content area - adjusts margin based on sidebar state */}
      <div style={{
        marginLeft: isFullscreen ? '0' : (newsSidebarOpen ? '320px' : '0'),
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Controls - hidden in fullscreen */}
        {!isFullscreen && (
          <ChartControls
            symbol={symbol}
            timeframe={currentTimeframe}
            source={currentSource}
            onTimeframeChange={handleTimeframeChange}
            onSourceChange={handleSourceChange}
            enableAlerts={enableAlerts}
            enableML={enableML}
            onStrategySelect={handleStrategySelect}
            activeStrategyId={activeStrategy?.id || null}
          />
        )}

      {/* Drawing Toolbar - hidden in fullscreen */}
      {!isFullscreen && (
        <DrawingToolbar
          activeDrawing={activeDrawingTool}
          onSelectTool={handleSelectDrawingTool}
          onClearAll={clearAllDrawings}
          onExport={handleExportDrawings}
          onImport={handleImportDrawings}
          drawingsCount={drawingsCount}
          theme={theme}
        />
      )}

      {/* Indicator toggles - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="indicator-panel" style={{
        padding: '10px',
        background: theme === 'dark' ? '#1e222d' : '#f5f5f5',
        borderBottom: '1px solid #2b2b43',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.volume}
            onChange={() => toggleIndicator('volume')}
          />
          Volume
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.sma20}
            onChange={() => toggleIndicator('sma20')}
          />
          SMA 20
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.sma50}
            onChange={() => toggleIndicator('sma50')}
          />
          SMA 50
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.ema20}
            onChange={() => toggleIndicator('ema20')}
          />
          EMA 20
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.bollingerBands}
            onChange={() => toggleIndicator('bollingerBands')}
          />
          Bollinger Bands
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.rsi}
            onChange={() => toggleIndicator('rsi')}
          />
          RSI
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>
          <input
            type="checkbox"
            checked={indicators.macd}
            onChange={() => toggleIndicator('macd')}
          />
          MACD
        </label>
      </div>
      )}

      {/* Time Range and Tools Panel - hidden in fullscreen */}
      {!isFullscreen && (
        <div style={{
        padding: '10px',
        background: theme === 'dark' ? '#1e222d' : '#f5f5f5',
        borderBottom: '1px solid #2b2b43',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919', fontSize: '13px', fontWeight: 'bold' }}>
          Time Range:
        </span>
        {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            style={{
              padding: '4px 12px',
              background: theme === 'dark' ? '#2b2b43' : '#e1e1e1',
              border: 'none',
              borderRadius: '4px',
              color: theme === 'dark' ? '#d1d4dc' : '#191919',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? '#363C4E' : '#d0d0d0'}
            onMouseLeave={(e) => e.currentTarget.style.background = theme === 'dark' ? '#2b2b43' : '#e1e1e1'}
          >
            {range}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={exportScreenshot}
            style={{
              padding: '6px 16px',
              background: theme === 'dark' ? '#2196F3' : '#1976D2',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? '#1976D2' : '#1565C0'}
            onMouseLeave={(e) => e.currentTarget.style.background = theme === 'dark' ? '#2196F3' : '#1976D2'}
          >
            📸 Export Chart
          </button>

          {/* Strategy Legend - inline with controls */}
          {activeStrategy && strategySignals.length > 0 && (
            <div style={{
              background: theme === 'dark' ? '#2b2b43' : '#ffffff',
              border: `1px solid ${theme === 'dark' ? '#363a45' : '#e1e1e1'}`,
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <span style={{
                fontWeight: 'bold',
                color: theme === 'dark' ? '#d1d4dc' : '#191919'
              }}>
                ⚡ {activeStrategy.name}
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#00ff00', fontSize: '14px' }}>▲</span>
                  <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919', fontSize: '11px' }}>Buy</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#ff0000', fontSize: '14px' }}>▼</span>
                  <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919', fontSize: '11px' }}>Sell</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}


      <div style={{ position: 'relative' }}>
        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1001,
            padding: '10px 16px',
            background: theme === 'dark' ? '#2b2b43' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? '#363a45' : '#e1e1e1'}`,
            borderRadius: '6px',
            color: theme === 'dark' ? '#d1d4dc' : '#191919',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme === 'dark' ? '#363a45' : '#f5f5f5';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme === 'dark' ? '#2b2b43' : '#ffffff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isFullscreen ? '⊗' : '⛶'} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>

        <div
          ref={chartContainerRef}
          className="chart-canvas"
          onContextMenu={handleContextMenu}
        />

        {/* Alert Markers Legend - Resonance.ai */}
        {enableAlerts && data?.markers && data.markers.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: theme === 'dark' ? '#1e222d' : '#f5f5f5',
            border: `1px solid ${theme === 'dark' ? '#2b2b43' : '#e1e1e1'}`,
            borderRadius: '6px',
            padding: '12px',
            zIndex: 1000,
            fontSize: '13px',
            minWidth: '180px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              fontWeight: 'bold',
              marginBottom: '8px',
              color: theme === 'dark' ? '#d1d4dc' : '#191919',
              borderBottom: `1px solid ${theme === 'dark' ? '#2b2b43' : '#e1e1e1'}`,
              paddingBottom: '6px'
            }}>
              Alert Signals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00ff00', fontSize: '16px' }}>⬆️</span>
                <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>Breakout</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ff0000', fontSize: '16px' }}>⬇️</span>
                <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>Breakdown</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#00aaff'
                }}></span>
                <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>Support</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ff00aa'
                }}></span>
                <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>Resistance</span>
              </div>
            </div>
          </div>
        )}

        {/* Strategy Signals Legend - positioned below Resonance legend */}
        {activeStrategy && strategySignals.length > 0 && (
          <div style={{
            position: 'absolute',
            top: enableAlerts && data?.markers && data.markers.length > 0 ? '240px' : '20px',
            left: '20px',
            background: theme === 'dark' ? '#1e222d' : '#f5f5f5',
            border: `1px solid ${theme === 'dark' ? '#2b2b43' : '#e1e1e1'}`,
            borderRadius: '6px',
            padding: '12px',
            zIndex: 1000,
            fontSize: '13px',
            minWidth: '180px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              fontWeight: 'bold',
              marginBottom: '8px',
              color: theme === 'dark' ? '#d1d4dc' : '#191919',
              borderBottom: `1px solid ${theme === 'dark' ? '#2b2b43' : '#e1e1e1'}`,
              paddingBottom: '6px'
            }}>
              Strategy: {activeStrategy.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00ff00', fontSize: '16px' }}>▲</span>
                <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>Buy Signal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#ff0000', fontSize: '16px' }}>▼</span>
                <span style={{ color: theme === 'dark' ? '#d1d4dc' : '#191919' }}>Sell Signal</span>
              </div>
              <div style={{
                marginTop: '4px',
                paddingTop: '6px',
                borderTop: `1px solid ${theme === 'dark' ? '#2b2b43' : '#e1e1e1'}`,
                fontSize: '11px',
                color: '#888'
              }}>
                {strategySignals.length} signal{strategySignals.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            background: '#1e222d',
            border: '1px solid #2b2b43',
            borderRadius: '4px',
            padding: '4px 0',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            minWidth: '200px'
          }}
        >
          <div style={{ padding: '4px 0', borderBottom: '1px solid #2b2b43' }}>
            <div style={{ padding: '4px 16px', color: '#888', fontSize: '12px', fontWeight: 'bold' }}>
              DRAWING TOOLS
            </div>
            <div
              onClick={() => handleDrawingTool('horizontal')}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px',
                background: drawingMode === 'horizontal' ? '#2b2b43' : 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = drawingMode === 'horizontal' ? '#2b2b43' : 'transparent'}
            >
              📏 Add Horizontal Line
            </div>
          </div>

          <div style={{ padding: '4px 0', borderBottom: '1px solid #2b2b43' }}>
            <div style={{ padding: '4px 16px', color: '#888', fontSize: '12px', fontWeight: 'bold' }}>
              INDICATORS
            </div>
            <div
              onClick={() => { toggleIndicator('sma20'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.sma20 ? '✓' : '○'} SMA 20
            </div>
            <div
              onClick={() => { toggleIndicator('sma50'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.sma50 ? '✓' : '○'} SMA 50
            </div>
            <div
              onClick={() => { toggleIndicator('ema20'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.ema20 ? '✓' : '○'} EMA 20
            </div>
            <div
              onClick={() => { toggleIndicator('bollingerBands'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.bollingerBands ? '✓' : '○'} Bollinger Bands
            </div>
            <div
              onClick={() => { toggleIndicator('volume'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.volume ? '✓' : '○'} Volume
            </div>
            <div
              onClick={() => { toggleIndicator('rsi'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.rsi ? '✓' : '○'} RSI
            </div>
            <div
              onClick={() => { toggleIndicator('macd'); closeContextMenu(); }}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#d1d4dc',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {indicators.macd ? '✓' : '○'} MACD
            </div>
          </div>

          <div style={{ padding: '4px 0' }}>
            <div
              onClick={clearAllDrawings}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                color: '#ef5350',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2b2b43'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              🗑️ Clear All Drawings
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="chart-loading-overlay">
          <div className="spinner">Loading chart data...</div>
        </div>
      )}

      <div className="chart-info">
        <span className="data-source">Source: {data?.source || currentSource}</span>
        {data?.candles && (
          <span className="candle-count">{data.candles.length} candles</span>
        )}
        {drawingsCount > 0 && (
          <span className="drawings-count">{drawingsCount} drawing{drawingsCount > 1 ? 's' : ''}</span>
        )}
      </div>
      </div>
    </div>
  );
};
