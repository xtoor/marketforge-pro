import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ColorType, CandlestickSeries, LineSeries, AreaSeries, ISeriesApi, MouseEventParams } from "lightweight-charts";
import { useMarketData } from "@/hooks/useMarketData";
import { useTradingStore } from "@/stores/tradingStore";
import { useDrawingStore } from "@/stores/drawingStore";
import { useDrawings } from "@/hooks/useDrawings";
import { useActiveIndicators } from "@/hooks/useIndicators";
import ChartContextMenu from "./ChartContextMenu";
import AddIndicatorDialog from "./AddIndicatorDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nanoid } from "nanoid";

interface ContextMenuPosition {
  x: number;
  y: number;
}

export default function TradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any | null>(null);
  const horizontalLinesRef = useRef<Map<string, any>>(new Map());
  const trendLineSeriesRef = useRef<Map<string, any>>(new Map());
  const fibonacciSeriesRef = useRef<Map<string, any[]>>(new Map());
  const indicatorSeriesRef = useRef<Map<string, any>>(new Map());
  const trendLinePointsRef = useRef<Array<{ time: number; price: number }>>([]);
  const fibonacciPointsRef = useRef<Array<{ time: number; price: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [showIndicatorDialog, setShowIndicatorDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  
  const { currentSymbol, selectedTimeframe, selectedChartType } = useTradingStore();
  const { candlestickData } = useMarketData(currentSymbol?.symbol || 'BTCUSDT', selectedTimeframe);
  const { 
    activeTool, 
    horizontalLines, 
    trendLines, 
    fibonacciRetracements,
    addHorizontalLine, 
    addTrendLine, 
    addFibonacciRetracement,
    removeHorizontalLine,
    removeTrendLine,
    removeFibonacciRetracement,
    clearAll,
    setActiveTool 
  } = useDrawingStore();

  // Drawings persistence
  const {
    saveHorizontalLine,
    saveTrendLine,
    saveFibonacci,
    clearAll: clearAllPersistent
  } = useDrawings('user-1', currentSymbol?.id || '', selectedTimeframe);

  // Active indicators
  const indicatorsWithData = useActiveIndicators();

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

      // Add series based on selected chart type
      let series: any;
      if (selectedChartType === 'Line') {
        series = chart.addSeries(LineSeries, {
          color: '#06B6D4',
          lineWidth: 2,
        });
      } else if (selectedChartType === 'Area') {
        series = chart.addSeries(AreaSeries, {
          topColor: 'rgba(6, 182, 212, 0.4)',
          bottomColor: 'rgba(6, 182, 212, 0.0)',
          lineColor: '#06B6D4',
          lineWidth: 2,
        });
      } else {
        // Candlestick or Heikin Ashi (both use candlestick series)
        series = chart.addSeries(CandlestickSeries, {
          upColor: '#10B981',
          downColor: '#EF4444',
          borderVisible: false,
          wickUpColor: '#10B981',
          wickDownColor: '#EF4444',
        });
      }

      // Set initial dummy data based on chart type
      const now = Math.floor(Date.now() / 1000);
      if (selectedChartType === 'Line' || selectedChartType === 'Area') {
        const dummyData = Array.from({ length: 50 }, (_, i) => {
          const value = 43000 + Math.random() * 2000;
          return {
            time: (now - (50 - i) * 3600) as any,
            value
          };
        });
        series.setData(dummyData);
      } else {
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
      }

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
  }, [selectedChartType]);

  useEffect(() => {
    if (candlestickSeriesRef.current && candlestickData.length > 0) {
      try {
        // Format data based on chart type
        if (selectedChartType === 'Line' || selectedChartType === 'Area') {
          // Line and Area charts use close price as value
          const formattedData = candlestickData.map(candle => ({
            time: candle.time,
            value: candle.close
          }));
          candlestickSeriesRef.current.setData(formattedData);
        } else {
          // Candlestick and Heikin Ashi use OHLC format
          const formattedData = candlestickData.map(candle => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
          }));
          candlestickSeriesRef.current.setData(formattedData);
        }
      } catch (dataError) {
        console.error('Chart data error:', dataError);
      }
    }
  }, [candlestickData, selectedChartType]);

  // Handle chart clicks for drawing tools
  useEffect(() => {
    if (!chartRef.current) return;

    const handleChartClick = (param: MouseEventParams) => {
      console.log('Chart clicked:', { hasPoint: !!param.point, hasTime: !!param.time, activeTool });
      
      if (!param.point) return;

      const price = candlestickSeriesRef.current?.coordinateToPrice(param.point.y);
      if (!price) {
        console.log('Could not get price from coordinate');
        return;
      }
      
      // For horizontal lines, we don't need time, just price
      const time = param.time || Math.floor(Date.now() / 1000);

      if (activeTool === 'horizontal') {
        // Add horizontal line
        const newLine = {
          id: nanoid(),
          price: price as number,
          color: '#06B6D4',
          label: `Line ${price.toFixed(2)}`
        };
        addHorizontalLine(newLine);
        saveHorizontalLine(newLine); // Save to database
        console.log('Horizontal line added at price:', price.toFixed(2));
      } else if (activeTool === 'trendline') {
        // Add points for trendline
        const newPoint = { time: time as number, price: price as number };
        trendLinePointsRef.current.push(newPoint);
        
        if (trendLinePointsRef.current.length === 2) {
          const newLine = {
            id: nanoid(),
            points: [...trendLinePointsRef.current],
            color: '#10B981',
            label: 'Trend Line'
          };
          addTrendLine(newLine);
          saveTrendLine(newLine); // Save to database
          trendLinePointsRef.current = [];
          console.log('Trend line added');
        } else {
          console.log('Click one more point to complete trend line');
        }
      } else if (activeTool === 'fibonacci') {
        // Add points for Fibonacci retracement
        const newPoint = { time: time as number, price: price as number };
        fibonacciPointsRef.current.push(newPoint);
        
        if (fibonacciPointsRef.current.length === 2) {
          const newFib = {
            id: nanoid(),
            startPoint: fibonacciPointsRef.current[0],
            endPoint: fibonacciPointsRef.current[1],
            color: '#F59E0B'
          };
          addFibonacciRetracement(newFib);
          saveFibonacci(newFib); // Save to database
          fibonacciPointsRef.current = [];
          console.log('Fibonacci retracement added');
        } else {
          console.log('Click one more point to complete Fibonacci retracement');
        }
      }
    };

    chartRef.current.subscribeClick(handleChartClick);

    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeClick(handleChartClick);
      }
    };
  }, [activeTool, addHorizontalLine, addTrendLine, addFibonacciRetracement, saveHorizontalLine, saveTrendLine, saveFibonacci]);

  // Render horizontal lines
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    // Remove old lines
    horizontalLinesRef.current.forEach((line) => {
      candlestickSeriesRef.current.removePriceLine(line);
    });
    horizontalLinesRef.current.clear();

    // Add new lines
    horizontalLines.forEach((line) => {
      const priceLine = candlestickSeriesRef.current.createPriceLine({
        price: line.price,
        color: line.color,
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: line.label || '',
      });
      horizontalLinesRef.current.set(line.id, priceLine);
    });
  }, [horizontalLines]);

  // Render trendlines using line series
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove old trendline series
    trendLineSeriesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    trendLineSeriesRef.current.clear();

    // Add new trendline series
    trendLines.forEach((line) => {
      const lineSeries = chartRef.current!.addSeries(LineSeries, {
        color: line.color,
        lineWidth: 2,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });

      // Set data for the line (two points) - must be sorted by time ascending
      const lineData = line.points
        .map(point => ({
          time: point.time as any,
          value: point.price
        }))
        .sort((a, b) => a.time - b.time);

      lineSeries.setData(lineData);
      trendLineSeriesRef.current.set(line.id, lineSeries);
    });
  }, [trendLines]);

  // Render Fibonacci retracement levels
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove old Fibonacci series
    fibonacciSeriesRef.current.forEach((seriesArray) => {
      seriesArray.forEach(series => {
        chartRef.current?.removeSeries(series);
      });
    });
    fibonacciSeriesRef.current.clear();

    // Fibonacci levels: 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
    const fibLevels = [
      { level: 0, label: '0%', color: '#9CA3AF' },
      { level: 0.236, label: '23.6%', color: '#F59E0B' },
      { level: 0.382, label: '38.2%', color: '#EF4444' },
      { level: 0.5, label: '50%', color: '#8B5CF6' },
      { level: 0.618, label: '61.8%', color: '#10B981' },
      { level: 0.786, label: '78.6%', color: '#06B6D4' },
      { level: 1, label: '100%', color: '#9CA3AF' }
    ];

    // Add new Fibonacci series
    fibonacciRetracements.forEach((fib) => {
      const seriesArray: any[] = [];
      const { startPoint, endPoint } = fib;
      const priceDiff = endPoint.price - startPoint.price;

      fibLevels.forEach(({ level, label, color }) => {
        const price = startPoint.price + (priceDiff * level);
        
        const lineSeries = chartRef.current!.addSeries(LineSeries, {
          color: color,
          lineWidth: 1,
          lineStyle: level === 0 || level === 1 ? 0 : 2, // Solid for 0 and 100%, dashed for others
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });

        // Create horizontal line between start and end times
        const lineData = [
          { time: startPoint.time as any, value: price },
          { time: endPoint.time as any, value: price }
        ];

        lineSeries.setData(lineData);
        seriesArray.push(lineSeries);
      });

      fibonacciSeriesRef.current.set(fib.id, seriesArray);
    });
  }, [fibonacciRetracements]);

  // Render indicators
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove old indicator series
    indicatorSeriesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    indicatorSeriesRef.current.clear();

    // Add new indicator series
    indicatorsWithData.forEach(({ indicator, data }) => {
      if (!data || !indicator.visible) return;

      const lineSeries = chartRef.current!.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
        priceLineVisible: false,
        title: indicator.name,
      });

      // Format data for the chart
      const formattedData = Array.isArray(data) ? data.map((item: any) => ({
        time: item.time as any,
        value: item.value
      })) : [];

      if (formattedData.length > 0) {
        lineSeries.setData(formattedData);
        indicatorSeriesRef.current.set(indicator.id, lineSeries);
      }
    });
  }, [indicatorsWithData]);

  if (error) {
    return (
      <div className="flex-1 relative flex items-center justify-center bg-card">
        <div className="text-center">
          <p className="text-destructive mb-2">Chart Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Calculate position with viewport clamping
    const menuWidth = 224; // w-56 = 14rem = 224px
    const menuHeight = 300; // Approximate height
    const padding = 8; // Safe padding from edges
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Clamp to viewport bounds
    if (x + menuWidth + padding > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }
    if (y + menuHeight + padding > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
    }
    if (x < padding) x = padding;
    if (y < padding) y = padding;
    
    setContextMenuPosition({ x, y });
  };

  const handleAddIndicator = () => {
    setShowIndicatorDialog(true);
  };

  const handleAddAlert = () => {
    setShowAlertDialog(true);
  };

  const handleAddDrawing = (tool: string) => {
    if (tool === 'horizontal') {
      setActiveTool('horizontal');
      console.log('Horizontal Line Tool activated - Click on the chart to place a horizontal line');
    } else if (tool === 'trendline') {
      setActiveTool('trendline');
      console.log('Trend Line Tool activated - Click two points on the chart to draw a trend line');
    } else if (tool === 'fibonacci') {
      setActiveTool('fibonacci');
      console.log('Fibonacci Tool activated - Click two points to draw Fibonacci retracement levels');
    }
  };

  const handleChartSettings = () => {
    console.log('Open chart settings');
    // TODO: Implement chart settings
  };

  const handleClearDrawings = () => {
    clearAllPersistent(); // Clear from database
    console.log('All drawings cleared');
  };

  return (
    <div className="flex-1 relative">
      <div 
        ref={chartContainerRef} 
        className="absolute inset-0 chart-grid" 
        data-testid="chart-container"
        onContextMenu={handleContextMenu}
      />
      
      {/* Price Label */}
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-primary text-primary-foreground px-2 py-1 text-xs font-mono rounded-l pulse-glow" data-testid="price-label">
        {candlestickData.length > 0 ? candlestickData[candlestickData.length - 1]?.close?.toFixed(2) : '43,250.78'}
      </div>
      
      {/* Volume Chart */}
      <div className="absolute bottom-0 left-0 right-4 h-24 glassmorphism border-t border-border">
        <div className="p-2 h-full">
          <div className="flex items-end justify-between h-full space-x-1">
            {/* Sample Volume Bars */}
            {Array.from({ length: 20 }, (_, i) => {
              const height = Math.random() * 80 + 10;
              const isGreen = Math.random() > 0.5;
              return (
                <div
                  key={i}
                  className={`w-2 rounded-t ${isGreen ? 'bg-secondary/60' : 'bg-destructive/60'}`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
          <div className="absolute top-1 left-2 text-xs text-muted-foreground">Volume</div>
        </div>
      </div>

      {/* Context Menu */}
      <ChartContextMenu
        position={contextMenuPosition}
        onClose={() => setContextMenuPosition(null)}
        onAddIndicator={handleAddIndicator}
        onAddAlert={handleAddAlert}
        onAddDrawing={handleAddDrawing}
        onChartSettings={handleChartSettings}
        onClearDrawings={handleClearDrawings}
      />

      {/* Add Indicator Dialog */}
      <AddIndicatorDialog 
        open={showIndicatorDialog} 
        onOpenChange={setShowIndicatorDialog}
      />

      {/* Add Alert Dialog */}
      <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <DialogContent data-testid="dialog-add-alert">
          <DialogHeader>
            <DialogTitle>Create Price Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="alert-type">Alert Type</Label>
              <Select>
                <SelectTrigger id="alert-type" data-testid="select-alert-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-above">Price Above</SelectItem>
                  <SelectItem value="price-below">Price Below</SelectItem>
                  <SelectItem value="price-crosses">Price Crosses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alert-price">Target Price</Label>
              <Input 
                id="alert-price" 
                type="number" 
                step="0.01"
                placeholder="Enter price"
                data-testid="input-alert-price"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAlertDialog(false)}
                data-testid="button-cancel-alert"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  // TODO: Add alert logic
                  setShowAlertDialog(false);
                }}
                data-testid="button-create-alert"
              >
                Create Alert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
