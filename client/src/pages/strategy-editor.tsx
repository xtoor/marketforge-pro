import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Play, Save, Plus, Code, BookOpen, TrendingUp, X } from "lucide-react";
import { useLocation } from "wouter";
import type { Symbol } from "@shared/schema";

const DEFAULT_STRATEGY = `# MarketForge Strategy Template
# Python-based trading strategy with advanced indicators, alerts, and labels

from strategy_api import Strategy, Indicator, Alert, Label, plot

class MyStrategy(Strategy):
    """
    Custom trading strategy using technical indicators
    """
    
    def initialize(self):
        """Initialize strategy parameters"""
        self.rsi_period = 14
        self.sma_fast = 10
        self.sma_slow = 20
        
    def on_bar(self, bar):
        """Execute on each new bar/candle
        
        Available bar properties:
        - bar.time: timestamp
        - bar.open, bar.high, bar.low, bar.close: OHLC prices
        - bar.volume: trading volume
        """
        
        # Get indicators
        rsi = Indicator.rsi(period=self.rsi_period)
        sma_fast = Indicator.sma(period=self.sma_fast)
        sma_slow = Indicator.sma(period=self.sma_slow)
        
        # Plot indicators on chart
        plot("RSI", rsi, color="purple", panel="lower")
        plot("SMA Fast", sma_fast, color="cyan")
        plot("SMA Slow", sma_slow, color="orange")
        
        # Add labels
        if rsi < 30:
            Label.add("Oversold", color="green", position="below")
        elif rsi > 70:
            Label.add("Overbought", color="red", position="above")
        
        # Create alerts
        if sma_fast > sma_slow and self.cross_above(sma_fast, sma_slow):
            Alert.create("Bullish Crossover", price=bar.close, type="buy")
            self.buy(quantity=1, price=bar.close)
            
        elif sma_fast < sma_slow and self.cross_below(sma_fast, sma_slow):
            Alert.create("Bearish Crossover", price=bar.close, type="sell")
            self.sell(quantity=1, price=bar.close)
`;

const API_DOCUMENTATION = `# Strategy API Documentation

## Core Classes

### Strategy
Base class for all strategies. Your strategy must inherit from this.

**Methods:**
- \`initialize()\`: Called once when strategy starts
- \`on_bar(bar)\`: Called on each new bar/candle
- \`buy(quantity, price=None)\`: Execute buy order
- \`sell(quantity, price=None)\`: Execute sell order
- \`cross_above(a, b)\`: Check if series a crosses above b
- \`cross_below(a, b)\`: Check if series a crosses below b

### Indicator
Built-in technical indicators

**Static Methods:**
- \`Indicator.sma(period)\`: Simple Moving Average
- \`Indicator.ema(period)\`: Exponential Moving Average
- \`Indicator.rsi(period)\`: Relative Strength Index
- \`Indicator.macd(fast, slow, signal)\`: MACD
- \`Indicator.bb(period, std)\`: Bollinger Bands
- \`Indicator.atr(period)\`: Average True Range
- \`Indicator.stoch(period)\`: Stochastic Oscillator

### Alert
Create price and condition-based alerts

**Static Methods:**
- \`Alert.create(message, price, type='info')\`: Create alert
  - message: Alert description
  - price: Price level for alert
  - type: 'buy', 'sell', 'info', 'warning'

### Label
Add visual labels to chart

**Static Methods:**
- \`Label.add(text, color='white', position='above')\`: Add label
  - text: Label text
  - color: Label color
  - position: 'above', 'below', 'center'

### plot()
Plot indicators on chart

**Function:**
- \`plot(name, value, color='cyan', panel='main')\`: Plot indicator
  - name: Display name
  - value: Indicator value
  - color: Line color
  - panel: 'main' or 'lower'

## Example Strategies

### RSI Strategy
\`\`\`python
def on_bar(self, bar):
    rsi = Indicator.rsi(14)
    
    if rsi < 30:
        self.buy(quantity=1)
        Alert.create("RSI Oversold", bar.close, "buy")
    elif rsi > 70:
        self.sell(quantity=1)
        Alert.create("RSI Overbought", bar.close, "sell")
\`\`\`

### Moving Average Crossover
\`\`\`python
def on_bar(self, bar):
    fast = Indicator.sma(10)
    slow = Indicator.sma(20)
    
    if self.cross_above(fast, slow):
        self.buy(quantity=1)
        Label.add("BUY", color="green", position="below")
\`\`\`
`;

export default function StrategyEditor() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState(DEFAULT_STRATEGY);
  const [strategyName, setStrategyName] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [backtestResults, setBacktestResults] = useState<any>(null);

  const { data: symbols = [] } = useQuery<Symbol[]>({
    queryKey: ['/api/symbols'],
  });

  const { data: strategies = [] } = useQuery<any[]>({
    queryKey: ['/api/strategies', 'user-1'],
  });

  const saveStrategyMutation = useMutation({
    mutationFn: async (strategyData: any) => {
      const res = await apiRequest('POST', '/api/strategies', strategyData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/strategies', 'user-1'] });
    },
  });

  const backtestMutation = useMutation({
    mutationFn: async (backtestData: any) => {
      const res = await apiRequest('POST', '/api/backtests/run', backtestData);
      return await res.json();
    },
    onSuccess: (data) => {
      setBacktestResults(data);
    },
  });

  const handleSaveStrategy = () => {
    if (!strategyName) {
      alert("Please enter a strategy name");
      return;
    }

    saveStrategyMutation.mutate({
      userId: 'user-1',
      name: strategyName,
      description: `Python strategy: ${strategyName}`,
      pythonCode: code,
      parameters: {},
      isActive: false,
    });
  };

  const handleBacktest = () => {
    if (!selectedSymbol) {
      alert("Please select a symbol");
      return;
    }

    backtestMutation.mutate({
      userId: 'user-1',
      symbolId: selectedSymbol,
      pythonCode: code,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      initialCapital: 10000,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="glassmorphism border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Code className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Strategy Editor</h1>
          </div>
          <Input
            placeholder="Strategy name..."
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            className="w-64"
            data-testid="input-strategy-name"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setLocation("/")}
            variant="ghost"
            data-testid="button-cancel"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-48" data-testid="select-backtest-symbol">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              {symbols.map((symbol) => (
                <SelectItem key={symbol.id} value={symbol.id}>
                  {symbol.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleBacktest}
            disabled={backtestMutation.isPending}
            data-testid="button-backtest"
          >
            <Play className="h-4 w-4 mr-2" />
            {backtestMutation.isPending ? 'Running...' : 'Backtest'}
          </Button>
          <Button 
            onClick={handleSaveStrategy}
            disabled={saveStrategyMutation.isPending}
            variant="default"
            data-testid="button-save-strategy"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveStrategyMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Section */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="editor" className="flex-1 flex flex-col">
            <TabsList className="glassmorphism border-b border-border rounded-none">
              <TabsTrigger value="editor" data-testid="tab-editor">
                <Code className="h-4 w-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="docs" data-testid="tab-docs">
                <BookOpen className="h-4 w-4 mr-2" />
                API Docs
              </TabsTrigger>
              <TabsTrigger value="strategies" data-testid="tab-strategies">
                <TrendingUp className="h-4 w-4 mr-2" />
                My Strategies
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="flex-1 m-0">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </TabsContent>

            <TabsContent value="docs" className="flex-1 m-0 overflow-auto p-4">
              <div className="prose prose-invert max-w-none">
                <pre className="bg-card p-4 rounded-lg overflow-auto text-sm">
                  {API_DOCUMENTATION}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="strategies" className="flex-1 m-0 overflow-auto p-4">
              <div className="space-y-2">
                {strategies.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No saved strategies</p>
                  </div>
                ) : (
                  strategies.map((strategy: any) => (
                    <Card key={strategy.id} className="bg-card" data-testid={`strategy-${strategy.id}`}>
                      <CardHeader>
                        <CardTitle>{strategy.name}</CardTitle>
                        <CardDescription>{strategy.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={() => {
                            setCode(strategy.pythonCode);
                            setStrategyName(strategy.name);
                          }}
                          data-testid={`button-load-strategy-${strategy.id}`}
                        >
                          Load Strategy
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Results Panel */}
        <div className="w-96 glassmorphism border-l border-border overflow-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Backtest Results</h3>
            
            {backtestResults ? (
              <div className="space-y-4">
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Return:</span>
                      <span className={`font-mono ${backtestResults.totalReturn >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                        {backtestResults.totalReturn?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sharpe Ratio:</span>
                      <span className="font-mono">{backtestResults.sharpeRatio?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Drawdown:</span>
                      <span className="font-mono text-destructive">{backtestResults.maxDrawdown?.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-mono">{backtestResults.winRate?.toFixed(2)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Capital</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial:</span>
                      <span className="font-mono">${backtestResults.initialCapital?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Final:</span>
                      <span className="font-mono">${backtestResults.finalCapital?.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">Run a backtest to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
