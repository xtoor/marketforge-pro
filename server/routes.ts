import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertSymbolSchema, insertMarketDataSchema, insertWatchlistSchema,
  insertOrderSchema, insertPositionSchema, insertAlertSchema,
  insertStrategySchema, insertBacktestSchema, insertDrawingSchema, updateDrawingSchema
} from "@shared/schema";
import { spawn } from "child_process";
import path from "path";
import { marketDataService } from "./marketDataService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time market data
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedClients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log('Client connected to WebSocket');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Subscribe to symbol updates
            ws.send(JSON.stringify({
              type: 'subscribed',
              symbol: data.symbol,
              status: 'success'
            }));
            break;
            
          case 'unsubscribe':
            // Unsubscribe from symbol updates
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              symbol: data.symbol,
              status: 'success'
            }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast market data to all connected clients
  const broadcastMarketData = (data: any) => {
    const message = JSON.stringify(data);
    connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Simulate real-time market data updates
  setInterval(() => {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'AAPL'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const price = 40000 + Math.random() * 20000;
    const change = (Math.random() - 0.5) * 5;
    
    broadcastMarketData({
      type: 'price_update',
      symbol,
      price: price.toFixed(2),
      change: change.toFixed(2),
      timestamp: new Date().toISOString()
    });
  }, 2000);

  // API Routes

  // Symbols
  app.get("/api/symbols", async (req, res) => {
    try {
      const symbols = await storage.getSymbols();
      res.json(symbols);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch symbols" });
    }
  });

  app.post("/api/symbols", async (req, res) => {
    try {
      const symbolData = insertSymbolSchema.parse(req.body);
      const symbol = await storage.createSymbol(symbolData);
      res.json(symbol);
    } catch (error) {
      res.status(400).json({ message: "Invalid symbol data" });
    }
  });

  // Market Data
  app.get("/api/market-data/:symbolId/:timeframe", async (req, res) => {
    try {
      const { symbolId, timeframe } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Ensure market data exists (will fetch from CoinGecko if missing)
      await marketDataService.ensureMarketDataExists(symbolId, timeframe);
      
      const data = await storage.getMarketData(symbolId, timeframe, limit);
      res.json(data);
    } catch (error) {
      console.error("Market data fetch error:", error);
      res.status(500).json({ message: "Failed to fetch market data" });
    }
  });

  // Technical Indicators
  app.get("/api/indicators/:symbolId/:timeframe/:indicatorType", async (req, res) => {
    try {
      const { symbolId, timeframe, indicatorType } = req.params;
      const params = req.query;
      
      // Ensure market data exists
      await marketDataService.ensureMarketDataExists(symbolId, timeframe);
      
      // Get OHLCV data
      const marketData = await storage.getMarketData(symbolId, timeframe, 500);
      
      if (marketData.length === 0) {
        return res.status(404).json({ message: "No market data found" });
      }
      
      // Prepare data for Python script
      const indicatorInput = {
        type: indicatorType,
        data: {
          open: marketData.map(d => d.open),
          high: marketData.map(d => d.high),
          low: marketData.map(d => d.low),
          close: marketData.map(d => d.close),
          volume: marketData.map(d => d.volume),
        },
        params: params
      };
      
      // Call Python indicators script
      const pythonPath = path.join(process.cwd(), 'python', 'indicator_calculator.py');
      const pythonProcess = spawn('python3', [pythonPath, JSON.stringify(indicatorInput)]);
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            
            // Transform indicator values into chart-ready format with timestamps
            if (result.values && Array.isArray(result.values)) {
              const chartData = result.values
                .map((value: any, index: number) => ({
                  time: marketData[index]?.timestamp ? Math.floor(new Date(marketData[index].timestamp).getTime() / 1000) : null,
                  value: typeof value === 'number' && !isNaN(value) ? value : null
                }))
                .filter((item: any) => item.value !== null && item.time != null)
                .sort((a: any, b: any) => a.time - b.time);
              
              res.json(chartData);
            } else if (result.error) {
              res.status(500).json({ message: result.error });
            } else {
              res.json(result);
            }
          } catch (parseError) {
            console.error("Failed to parse Python output:", output);
            res.status(500).json({ message: "Invalid indicator calculation result" });
          }
        } else {
          console.error("Python indicator error:", errorOutput);
          res.status(500).json({ 
            message: "Failed to calculate indicators",
            error: errorOutput 
          });
        }
      });
    } catch (error) {
      console.error("Indicator calculation error:", error);
      res.status(500).json({ message: "Failed to calculate indicators" });
    }
  });

  // Watchlist
  app.get("/api/watchlist/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const watchlist = await storage.getWatchlist(userId);
      res.json(watchlist);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const watchlistData = insertWatchlistSchema.parse(req.body);
      const watchlistItem = await storage.addToWatchlist(watchlistData);
      res.json(watchlistItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid watchlist data" });
    }
  });

  app.delete("/api/watchlist/:userId/:symbolId", async (req, res) => {
    try {
      const { userId, symbolId } = req.params;
      await storage.removeFromWatchlist(userId, symbolId);
      res.json({ message: "Removed from watchlist" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // Orders
  app.get("/api/orders/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const orders = await storage.getOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Broadcast order update via WebSocket
      broadcastMarketData({
        type: 'order_created',
        order,
        timestamp: new Date().toISOString()
      });
      
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.delete("/api/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      await storage.cancelOrder(orderId);
      
      broadcastMarketData({
        type: 'order_cancelled',
        orderId,
        timestamp: new Date().toISOString()
      });
      
      res.json({ message: "Order cancelled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  // Positions
  app.get("/api/positions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const positions = await storage.getPositions(userId);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch positions" });
    }
  });

  // Alerts
  app.get("/api/alerts/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const alerts = await storage.getAlerts(userId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      res.json(alert);
    } catch (error) {
      res.status(400).json({ message: "Invalid alert data" });
    }
  });

  app.delete("/api/alerts/:alertId", async (req, res) => {
    try {
      const { alertId } = req.params;
      await storage.deleteAlert(alertId);
      res.json({ message: "Alert deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  // Strategies
  app.get("/api/strategies/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const strategies = await storage.getStrategies(userId);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch strategies" });
    }
  });

  app.post("/api/strategies", async (req, res) => {
    try {
      const strategyData = insertStrategySchema.parse(req.body);
      const strategy = await storage.createStrategy(strategyData);
      res.json(strategy);
    } catch (error) {
      res.status(400).json({ message: "Invalid strategy data" });
    }
  });

  // Python Strategy Execution
  app.post("/api/strategies/:strategyId/run", async (req, res) => {
    try {
      const { strategyId } = req.params;
      const strategy = await storage.getStrategy(strategyId);
      
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      // Execute Python strategy
      const pythonPath = path.join(process.cwd(), 'python', 'strategy_engine.py');
      const pythonProcess = spawn('python', [pythonPath, strategy.pythonCode]);
      
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          res.json({ 
            status: 'success', 
            output,
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(500).json({ 
            status: 'error', 
            error: errorOutput,
            timestamp: new Date().toISOString()
          });
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to execute strategy" });
    }
  });

  // Backtesting
  app.post("/api/backtests/run", async (req, res) => {
    try {
      // Simple backtest without strategy ID - use python code directly
      const { userId, symbolId, pythonCode, startDate, endDate, initialCapital } = req.body;
      
      // Mock results for now (Python engine would return real results)
      const mockResults = {
        initialCapital,
        finalCapital: initialCapital * (1 + Math.random() * 0.5 - 0.2),
        totalReturn: (Math.random() * 50 - 20).toFixed(2),
        sharpeRatio: (Math.random() * 2).toFixed(2),
        maxDrawdown: (Math.random() * -30).toFixed(2),
        winRate: (40 + Math.random() * 40).toFixed(2),
      };
      
      res.json(mockResults);
    } catch (error) {
      res.status(500).json({ message: "Backtest failed" });
    }
  });

  app.post("/api/backtest", async (req, res) => {
    try {
      const backtestData = insertBacktestSchema.parse(req.body);
      
      // Create initial backtest record
      const backtest = await storage.createBacktest(backtestData);
      
      // Run Python backtesting engine
      const pythonPath = path.join(process.cwd(), 'python', 'backtester.py');
      const strategy = await storage.getStrategy(backtestData.strategyId!);
      
      if (!strategy) {
        return res.status(404).json({ message: "Strategy not found" });
      }

      const backtestConfig = {
        strategyCode: strategy.pythonCode,
        symbol: backtestData.symbolId,
        startDate: backtestData.startDate,
        endDate: backtestData.endDate,
        initialCapital: backtestData.initialCapital
      };

      const pythonProcess = spawn('python', [
        pythonPath, 
        JSON.stringify(backtestConfig)
      ]);
      
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(output);
            
            // Update backtest with results
            const updatedBacktest = await storage.updateBacktest(backtest.id, {
              finalCapital: results.finalCapital,
              totalReturn: results.totalReturn,
              sharpeRatio: results.sharpeRatio,
              maxDrawdown: results.maxDrawdown,
              winRate: results.winRate,
              results: results
            });
            
            res.json(updatedBacktest);
          } catch (parseError) {
            res.status(500).json({ 
              message: "Failed to parse backtest results",
              error: output 
            });
          }
        } else {
          res.status(500).json({ 
            message: "Backtest failed",
            error: errorOutput 
          });
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid backtest data" });
    }
  });

  // Drawings
  app.get("/api/drawings/:userId/:symbolId/:timeframe", async (req, res) => {
    try {
      const { userId, symbolId, timeframe } = req.params;
      const { from, to } = req.query;
      
      const options = {
        from: from ? Number(from) : undefined,
        to: to ? Number(to) : undefined
      };
      
      const drawings = await storage.getDrawings(userId, symbolId, timeframe, options);
      res.json(drawings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drawings" });
    }
  });

  app.get("/api/drawings/:id", async (req, res) => {
    try {
      const drawing = await storage.getDrawing(req.params.id);
      if (!drawing) {
        return res.status(404).json({ message: "Drawing not found" });
      }
      res.json(drawing);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drawing" });
    }
  });

  app.post("/api/drawings", async (req, res) => {
    try {
      console.log('POST /api/drawings received:', JSON.stringify(req.body, null, 2));
      const drawingData = insertDrawingSchema.parse(req.body);
      const drawing = await storage.createDrawing(drawingData);
      res.json(drawing);
    } catch (error) {
      console.error('Drawing validation error:', error);
      res.status(400).json({ message: "Invalid drawing data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/drawings/:id", async (req, res) => {
    try {
      const updates = updateDrawingSchema.parse(req.body);
      const drawing = await storage.updateDrawing(req.params.id, updates);
      res.json(drawing);
    } catch (error) {
      res.status(400).json({ message: "Invalid drawing update" });
    }
  });

  app.delete("/api/drawings/:id", async (req, res) => {
    try {
      await storage.deleteDrawing(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete drawing" });
    }
  });

  return httpServer;
}
