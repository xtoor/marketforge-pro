import { useState, useEffect } from "react";
import TradingChart from "@/components/trading/TradingChart";
import Watchlist from "@/components/trading/Watchlist";
import Portfolio from "@/components/trading/Portfolio";
import TechnicalIndicators from "@/components/trading/TechnicalIndicators";
import OrderEntry from "@/components/trading/OrderEntry";
import OpenOrders from "@/components/trading/OpenOrders";
import Positions from "@/components/trading/Positions";
import TradeHistory from "@/components/trading/TradeHistory";
import Alerts from "@/components/trading/Alerts";
import MarketNews from "@/components/trading/MarketNews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarketData } from "@/hooks/useMarketData";
import { useTradingStore } from "@/stores/tradingStore";
import { useDrawingStore } from "@/stores/drawingStore";
import { useQuery } from "@tanstack/react-query";
import type { Symbol } from "@shared/schema";
import { ChartLine, Search, Settings, Bell, User, Cog, MousePointer, Square, TrendingUp, Trash2, Code } from "lucide-react";
import { Link } from "wouter";

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W', '1M'];
const chartTypes = ['Candlestick', 'Line', 'Area', 'Heikin Ashi'];

export default function TradingDashboard() {
  const { currentSymbol, selectedTimeframe, selectedChartType, setSelectedTimeframe, setSelectedChartType, setCurrentSymbol } = useTradingStore();
  const { activeTool, setActiveTool, clearAll } = useDrawingStore();
  const { currentPrice, priceChange, priceChangePercent } = useMarketData(currentSymbol?.symbol || 'BTCUSDT');
  
  const [searchQuery, setSearchQuery] = useState('');

  // Load symbols and set default
  const { data: symbols } = useQuery<Symbol[]>({ 
    queryKey: ['/api/symbols']
  });

  // Set default symbol to BTCUSDT if no symbol is selected
  useEffect(() => {
    if (!currentSymbol && symbols && symbols.length > 0) {
      const btcSymbol = symbols.find(s => s.symbol === 'BTCUSDT');
      if (btcSymbol) {
        setCurrentSymbol(btcSymbol);
      }
    }
  }, [currentSymbol, symbols, setCurrentSymbol]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Navbar */}
      <header className="glassmorphism border-b border-border px-4 py-2 flex items-center justify-between z-50">
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
              <ChartLine className="w-4 h-4 text-background" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              MarketForge Pro
            </span>
          </div>
          
          {/* Symbol Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border-border w-64 pl-10 focus:ring-2 focus:ring-primary focus:border-primary"
              data-testid="input-symbol-search"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Current Symbol */}
          <div className="flex items-center space-x-2 bg-card rounded-lg px-4 py-2 neon-border">
            <span className="font-bold text-lg" data-testid="text-current-symbol">
              {currentSymbol?.symbol || 'BTCUSDT'}
            </span>
            <div className="flex flex-col">
              <span 
                className={`font-mono text-sm ${priceChangePercent >= 0 ? 'text-secondary' : 'text-destructive'}`}
                data-testid="text-current-price"
              >
                ${currentPrice.toLocaleString()}
              </span>
              <span 
                className={`font-mono text-xs ${priceChangePercent >= 0 ? 'text-secondary' : 'text-destructive'}`}
                data-testid="text-price-change"
              >
                {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center space-x-1 bg-card rounded-lg p-1">
          {timeframes.map(tf => (
            <Button
              key={tf}
              variant={selectedTimeframe === tf ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedTimeframe(tf)}
              className={selectedTimeframe === tf ? "bg-primary text-primary-foreground" : "hover:bg-primary hover:text-primary-foreground"}
              data-testid={`button-timeframe-${tf}`}
            >
              {tf}
            </Button>
          ))}
        </div>
        
        {/* Tools & Settings */}
        <div className="flex items-center space-x-4">
          <Link href="/strategy-editor">
            <Button variant="outline" size="icon" title="Strategy Editor" data-testid="button-strategy-editor">
              <Code className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 glassmorphism border-r border-border flex flex-col">
          <Watchlist />
          <Portfolio />
          <MarketNews />
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Toolbar */}
          <div className="glassmorphism border-b border-border p-2">
            <div className="flex items-center justify-between">
              {/* Drawing Tools */}
              <div className="flex items-center space-x-1">
                <Button 
                  variant={activeTool === 'none' ? 'default' : 'ghost'} 
                  size="sm" 
                  title="Cursor" 
                  onClick={() => setActiveTool('none')}
                  data-testid="button-tool-cursor"
                >
                  <MousePointer className="h-4 w-4" />
                </Button>
                <Button 
                  variant={activeTool === 'trendline' ? 'default' : 'ghost'} 
                  size="sm" 
                  title="Trendline" 
                  onClick={() => setActiveTool('trendline')}
                  data-testid="button-tool-trendline"
                >
                  <ChartLine className="h-4 w-4" />
                </Button>
                <Button 
                  variant={activeTool === 'horizontal' ? 'default' : 'ghost'} 
                  size="sm" 
                  title="Horizontal Line" 
                  onClick={() => setActiveTool('horizontal')}
                  data-testid="button-tool-rectangle"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button 
                  variant={activeTool === 'fibonacci' ? 'default' : 'ghost'} 
                  size="sm" 
                  title="Fibonacci Retracement" 
                  onClick={() => setActiveTool('fibonacci')}
                  data-testid="button-tool-fibonacci"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  title="Clear All Drawings" 
                  onClick={clearAll}
                  data-testid="button-clear-tools"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Chart Type */}
              <div className="flex items-center space-x-1">
                {chartTypes.map(type => (
                  <Button
                    key={type}
                    variant={selectedChartType === type ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedChartType(type)}
                    data-testid={`button-chart-type-${type.toLowerCase().replace(' ', '-')}`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <TradingChart />
        </div>

        {/* Right Sidebar */}
        <div className="w-80 glassmorphism border-l border-border flex flex-col">
          <TechnicalIndicators />
          <OrderEntry />
          <OpenOrders />
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="h-48 glassmorphism border-t border-border">
        <div className="h-full flex">
          <div className="flex-1 border-r border-border">
            <Positions />
          </div>
          <div className="flex-1 border-r border-border">
            <TradeHistory />
          </div>
          <div className="flex-1">
            <Alerts />
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="fixed bottom-4 right-4 flex items-center space-x-2 glassmorphism rounded-full px-4 py-2 neon-border">
        <div className="w-2 h-2 bg-secondary rounded-full pulse-glow" />
        <span className="text-xs font-medium">Live Market Data</span>
        <span className="text-xs text-muted-foreground">Connected</span>
      </div>
    </div>
  );
}
