import { 
  type User, type InsertUser, type Symbol, type InsertSymbol,
  type MarketData, type InsertMarketData, type Watchlist, type InsertWatchlist,
  type Order, type InsertOrder, type Position, type InsertPosition,
  type Alert, type InsertAlert, type Strategy, type InsertStrategy,
  type Backtest, type InsertBacktest, type Drawing, type InsertDrawing, type UpdateDrawing,
  users, symbols, marketData, watchlists, orders, positions, alerts, strategies, backtests, drawings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sql as dSql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Symbols
  getSymbols(): Promise<Symbol[]>;
  getSymbol(id: string): Promise<Symbol | undefined>;
  getSymbolBySymbol(symbol: string): Promise<Symbol | undefined>;
  createSymbol(symbol: InsertSymbol): Promise<Symbol>;

  // Market Data
  getMarketData(symbolId: string, timeframe: string, limit?: number): Promise<MarketData[]>;
  insertMarketData(data: InsertMarketData): Promise<MarketData>;

  // Watchlists
  getWatchlist(userId: string): Promise<(Watchlist & { symbol: Symbol })[]>;
  addToWatchlist(watchlist: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(userId: string, symbolId: string): Promise<void>;

  // Orders
  getOrders(userId: string): Promise<(Order & { symbol: Symbol })[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order>;
  cancelOrder(id: string): Promise<void>;

  // Positions
  getPositions(userId: string): Promise<(Position & { symbol: Symbol })[]>;
  getPosition(id: string): Promise<Position | undefined>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<Position>): Promise<Position>;
  closePosition(id: string): Promise<void>;

  // Alerts
  getAlerts(userId: string): Promise<(Alert & { symbol: Symbol })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  deleteAlert(id: string): Promise<void>;

  // Strategies
  getStrategies(userId: string): Promise<Strategy[]>;
  getStrategy(id: string): Promise<Strategy | undefined>;
  createStrategy(strategy: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy>;
  deleteStrategy(id: string): Promise<void>;

  // Backtests
  getBacktests(userId: string): Promise<(Backtest & { strategy: Strategy; symbol: Symbol })[]>;
  createBacktest(backtest: InsertBacktest): Promise<Backtest>;
  updateBacktest(id: string, updates: Partial<Backtest>): Promise<Backtest>;

  // Drawings
  getDrawings(userId: string, symbolId: string, timeframe: string, options?: { from?: number; to?: number }): Promise<Drawing[]>;
  getDrawing(id: string): Promise<Drawing | undefined>;
  createDrawing(drawing: InsertDrawing): Promise<Drawing>;
  updateDrawing(id: string, updates: UpdateDrawing): Promise<Drawing>;
  deleteDrawing(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private symbols: Map<string, Symbol> = new Map();
  private marketData: Map<string, MarketData[]> = new Map();
  private watchlists: Map<string, Watchlist> = new Map();
  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private strategies: Map<string, Strategy> = new Map();
  private backtests: Map<string, Backtest> = new Map();

  constructor() {
    // Initialize with some default symbols
    this.initializeDefaultSymbols();
  }

  private initializeDefaultSymbols() {
    const defaultSymbols = [
      { symbol: "BTCUSDT", name: "Bitcoin", type: "crypto", exchange: "Binance", isActive: true },
      { symbol: "ETHUSDT", name: "Ethereum", type: "crypto", exchange: "Binance", isActive: true },
      { symbol: "AAPL", name: "Apple Inc.", type: "stock", exchange: "NASDAQ", isActive: true },
      { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", exchange: "NASDAQ", isActive: true },
      { symbol: "EURUSD", name: "Euro/US Dollar", type: "forex", exchange: "FX", isActive: true },
    ];

    defaultSymbols.forEach(symbolData => {
      const id = randomUUID();
      const symbol: Symbol = { 
      id, 
      symbol: symbolData.symbol,
      name: symbolData.name,
      type: symbolData.type,
      exchange: symbolData.exchange || null, 
      isActive: symbolData.isActive ?? true 
    };
      this.symbols.set(id, symbol);
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  // Symbols
  async getSymbols(): Promise<Symbol[]> {
    return Array.from(this.symbols.values()).filter(symbol => symbol.isActive);
  }

  async getSymbol(id: string): Promise<Symbol | undefined> {
    return this.symbols.get(id);
  }

  async getSymbolBySymbol(symbol: string): Promise<Symbol | undefined> {
    return Array.from(this.symbols.values()).find(s => s.symbol === symbol);
  }

  async createSymbol(insertSymbol: InsertSymbol): Promise<Symbol> {
    const id = randomUUID();
    const symbol: Symbol = { ...insertSymbol, id };
    this.symbols.set(id, symbol);
    return symbol;
  }

  // Market Data
  async getMarketData(symbolId: string, timeframe: string, limit = 100): Promise<MarketData[]> {
    const key = `${symbolId}_${timeframe}`;
    const data = this.marketData.get(key) || [];
    return data.slice(-limit);
  }

  async insertMarketData(data: InsertMarketData): Promise<MarketData> {
    const id = randomUUID();
    const marketData: MarketData = { 
      ...data, 
      id
    };
    const key = `${data.symbolId}_${data.timeframe}`;
    
    if (!this.marketData.has(key)) {
      this.marketData.set(key, []);
    }
    
    this.marketData.get(key)!.push(marketData);
    return marketData;
  }

  // Watchlists
  async getWatchlist(userId: string): Promise<(Watchlist & { symbol: Symbol })[]> {
    const userWatchlists = Array.from(this.watchlists.values())
      .filter(w => w.userId === userId);
    
    return userWatchlists.map(watchlist => {
      const symbol = this.symbols.get(watchlist.symbolId!)!;
      return { ...watchlist, symbol };
    });
  }

  async addToWatchlist(insertWatchlist: InsertWatchlist): Promise<Watchlist> {
    const id = randomUUID();
    const watchlist: Watchlist = { 
      ...insertWatchlist, 
      id, 
      createdAt: new Date()
    };
    this.watchlists.set(id, watchlist);
    return watchlist;
  }

  async removeFromWatchlist(userId: string, symbolId: string): Promise<void> {
    const watchlistEntry = Array.from(this.watchlists.entries())
      .find(([_, w]) => w.userId === userId && w.symbolId === symbolId);
    
    if (watchlistEntry) {
      this.watchlists.delete(watchlistEntry[0]);
    }
  }

  // Orders
  async getOrders(userId: string): Promise<(Order & { symbol: Symbol })[]> {
    const userOrders = Array.from(this.orders.values())
      .filter(o => o.userId === userId);
    
    return userOrders.map(order => {
      const symbol = this.symbols.get(order.symbolId!)!;
      return { ...order, symbol };
    });
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder, 
      id, 
      status: 'pending',
      filledQuantity: '0',
      createdAt: new Date(),
      updatedAt: new Date(),
      price: insertOrder.price || null,
      stopPrice: insertOrder.stopPrice || null
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error('Order not found');
    
    const updatedOrder = { ...order, ...updates, updatedAt: new Date() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async cancelOrder(id: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      this.orders.set(id, { ...order, status: 'cancelled', updatedAt: new Date() });
    }
  }

  // Positions
  async getPositions(userId: string): Promise<(Position & { symbol: Symbol })[]> {
    const userPositions = Array.from(this.positions.values())
      .filter(p => p.userId === userId);
    
    return userPositions.map(position => {
      const symbol = this.symbols.get(position.symbolId!)!;
      return { ...position, symbol };
    });
  }

  async getPosition(id: string): Promise<Position | undefined> {
    return this.positions.get(id);
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const position: Position = { 
      ...insertPosition, 
      id, 
      markPrice: insertPosition.entryPrice,
      pnl: '0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.positions.set(id, position);
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
    const position = this.positions.get(id);
    if (!position) throw new Error('Position not found');
    
    const updatedPosition = { ...position, ...updates, updatedAt: new Date() };
    this.positions.set(id, updatedPosition);
    return updatedPosition;
  }

  async closePosition(id: string): Promise<void> {
    this.positions.delete(id);
  }

  // Alerts
  async getAlerts(userId: string): Promise<(Alert & { symbol: Symbol })[]> {
    const userAlerts = Array.from(this.alerts.values())
      .filter(a => a.userId === userId && a.isActive);
    
    return userAlerts.map(alert => {
      const symbol = this.symbols.get(alert.symbolId!)!;
      return { ...alert, symbol };
    });
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = { 
      ...insertAlert, 
      id, 
      createdAt: new Date(), 
      isActive: insertAlert.isActive ?? true, 
      indicator: insertAlert.indicator || null 
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
  }

  // Strategies
  async getStrategies(userId: string): Promise<Strategy[]> {
    return Array.from(this.strategies.values())
      .filter(s => s.userId === userId);
  }

  async getStrategy(id: string): Promise<Strategy | undefined> {
    return this.strategies.get(id);
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const id = randomUUID();
    const strategy: Strategy = { 
      ...insertStrategy, 
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
      description: insertStrategy.description || null,
      userId: insertStrategy.userId || null,
      isActive: insertStrategy.isActive ?? false,
      parameters: insertStrategy.parameters || null
    };
    this.strategies.set(id, strategy);
    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    const strategy = this.strategies.get(id);
    if (!strategy) throw new Error('Strategy not found');
    
    const updatedStrategy = { ...strategy, ...updates, updatedAt: new Date() };
    this.strategies.set(id, updatedStrategy);
    return updatedStrategy;
  }

  async deleteStrategy(id: string): Promise<void> {
    this.strategies.delete(id);
  }

  // Backtests
  async getBacktests(userId: string): Promise<(Backtest & { strategy: Strategy; symbol: Symbol })[]> {
    const userBacktests = Array.from(this.backtests.values())
      .filter(b => b.userId === userId);
    
    return userBacktests.map(backtest => {
      const strategy = this.strategies.get(backtest.strategyId!)!;
      const symbol = this.symbols.get(backtest.symbolId!)!;
      return { ...backtest, strategy, symbol };
    });
  }

  async createBacktest(insertBacktest: InsertBacktest): Promise<Backtest> {
    const id = randomUUID();
    const backtest: Backtest = { 
      ...insertBacktest, 
      id, 
      createdAt: new Date(),
      userId: insertBacktest.userId || null,
      symbolId: insertBacktest.symbolId || null,
      strategyId: insertBacktest.strategyId || null,
      finalCapital: null,
      totalReturn: null,
      sharpeRatio: null,
      maxDrawdown: null,
      winRate: null,
      results: null
    };
    this.backtests.set(id, backtest);
    return backtest;
  }

  async updateBacktest(id: string, updates: Partial<Backtest>): Promise<Backtest> {
    const backtest = this.backtests.get(id);
    if (!backtest) throw new Error('Backtest not found');
    
    const updatedBacktest = { ...backtest, ...updates };
    this.backtests.set(id, updatedBacktest);
    return updatedBacktest;
  }
}

// Database Storage Implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  // Initialize with default symbols on first use
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.ensureInitialized();
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    
    const existingSymbols = await db.select().from(symbols);
    if (existingSymbols.length === 0) {
      await this.initializeDefaultSymbols();
    }
    
    this.initialized = true;
  }

  private async initializeDefaultSymbols() {
    const defaultSymbols = [
      { symbol: "BTCUSDT", name: "Bitcoin", type: "crypto", exchange: "Binance", isActive: true },
      { symbol: "ETHUSDT", name: "Ethereum", type: "crypto", exchange: "Binance", isActive: true },
      { symbol: "AAPL", name: "Apple Inc.", type: "stock", exchange: "NASDAQ", isActive: true },
      { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", exchange: "NASDAQ", isActive: true },
      { symbol: "EURUSD", name: "Euro/US Dollar", type: "forex", exchange: "FX", isActive: true },
    ];

    try {
      await db.insert(symbols).values(defaultSymbols).onConflictDoNothing();
    } catch (error) {
      console.log("Symbols already initialized or error seeding:", error);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Symbols
  async getSymbols(): Promise<Symbol[]> {
    if (this.initPromise) await this.initPromise;
    return await db.select().from(symbols).where(eq(symbols.isActive, true));
  }

  async getSymbol(id: string): Promise<Symbol | undefined> {
    const [symbol] = await db.select().from(symbols).where(eq(symbols.id, id));
    return symbol;
  }

  async getSymbolBySymbol(symbol: string): Promise<Symbol | undefined> {
    const [result] = await db.select().from(symbols).where(eq(symbols.symbol, symbol));
    return result;
  }

  async createSymbol(insertSymbol: InsertSymbol): Promise<Symbol> {
    const [symbol] = await db.insert(symbols).values(insertSymbol).returning();
    return symbol;
  }

  // Market Data
  async getMarketData(symbolId: string, timeframe: string, limit = 100): Promise<MarketData[]> {
    const results = await db.select()
      .from(marketData)
      .where(and(
        eq(marketData.symbolId, symbolId),
        eq(marketData.timeframe, timeframe)
      ))
      .orderBy(desc(marketData.timestamp))
      .limit(limit);
    
    return results.reverse();
  }

  async insertMarketData(data: InsertMarketData): Promise<MarketData> {
    const inserted = await db.insert(marketData).values(data).onConflictDoNothing({
      target: [marketData.symbolId, marketData.timeframe, marketData.timestamp]
    }).returning();
    
    if (inserted.length > 0) {
      return inserted[0];
    }
    
    const [existing] = await db.select()
      .from(marketData)
      .where(and(
        eq(marketData.symbolId, data.symbolId),
        eq(marketData.timeframe, data.timeframe),
        eq(marketData.timestamp, data.timestamp)
      ))
      .limit(1);
    
    return existing;
  }

  // Watchlists
  async getWatchlist(userId: string): Promise<(Watchlist & { symbol: Symbol })[]> {
    return await db.select({
      id: watchlists.id,
      userId: watchlists.userId,
      symbolId: watchlists.symbolId,
      createdAt: watchlists.createdAt,
      symbol: symbols
    })
    .from(watchlists)
    .innerJoin(symbols, eq(watchlists.symbolId, symbols.id))
    .where(eq(watchlists.userId, userId));
  }

  async addToWatchlist(insertWatchlist: InsertWatchlist): Promise<Watchlist> {
    const inserted = await db.insert(watchlists).values(insertWatchlist).onConflictDoNothing({
      target: [watchlists.userId, watchlists.symbolId]
    }).returning();
    
    if (inserted.length > 0) {
      return inserted[0];
    }
    
    const [existing] = await db.select()
      .from(watchlists)
      .where(and(
        eq(watchlists.userId, insertWatchlist.userId),
        eq(watchlists.symbolId, insertWatchlist.symbolId)
      ));
    
    return existing;
  }

  async removeFromWatchlist(userId: string, symbolId: string): Promise<void> {
    await db.delete(watchlists)
      .where(and(
        eq(watchlists.userId, userId),
        eq(watchlists.symbolId, symbolId)
      ));
  }

  // Orders
  async getOrders(userId: string): Promise<(Order & { symbol: Symbol })[]> {
    return await db.select({
      id: orders.id,
      userId: orders.userId,
      symbolId: orders.symbolId,
      side: orders.side,
      type: orders.type,
      quantity: orders.quantity,
      price: orders.price,
      stopPrice: orders.stopPrice,
      status: orders.status,
      filledQuantity: orders.filledQuantity,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      symbol: symbols
    })
    .from(orders)
    .innerJoin(symbols, eq(orders.symbolId, symbols.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async cancelOrder(id: string): Promise<void> {
    await db.update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  // Positions
  async getPositions(userId: string): Promise<(Position & { symbol: Symbol })[]> {
    return await db.select({
      id: positions.id,
      userId: positions.userId,
      symbolId: positions.symbolId,
      side: positions.side,
      quantity: positions.quantity,
      entryPrice: positions.entryPrice,
      markPrice: positions.markPrice,
      pnl: positions.pnl,
      createdAt: positions.createdAt,
      updatedAt: positions.updatedAt,
      symbol: symbols
    })
    .from(positions)
    .innerJoin(symbols, eq(positions.symbolId, symbols.id))
    .where(eq(positions.userId, userId));
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(positions).where(eq(positions.id, id));
    return position;
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const [position] = await db.insert(positions).values({
      ...insertPosition,
      markPrice: insertPosition.entryPrice,
      pnl: '0'
    }).returning();
    return position;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position> {
    const [position] = await db.update(positions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async closePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

  // Alerts
  async getAlerts(userId: string): Promise<(Alert & { symbol: Symbol })[]> {
    return await db.select({
      id: alerts.id,
      userId: alerts.userId,
      symbolId: alerts.symbolId,
      type: alerts.type,
      condition: alerts.condition,
      value: alerts.value,
      indicator: alerts.indicator,
      isActive: alerts.isActive,
      createdAt: alerts.createdAt,
      symbol: symbols
    })
    .from(alerts)
    .innerJoin(symbols, eq(alerts.symbolId, symbols.id))
    .where(and(
      eq(alerts.userId, userId),
      eq(alerts.isActive, true)
    ));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async deleteAlert(id: string): Promise<void> {
    await db.delete(alerts).where(eq(alerts.id, id));
  }

  // Strategies
  async getStrategies(userId: string): Promise<Strategy[]> {
    return await db.select().from(strategies).where(eq(strategies.userId, userId));
  }

  async getStrategy(id: string): Promise<Strategy | undefined> {
    const [strategy] = await db.select().from(strategies).where(eq(strategies.id, id));
    return strategy;
  }

  async createStrategy(insertStrategy: InsertStrategy): Promise<Strategy> {
    const [strategy] = await db.insert(strategies).values(insertStrategy).returning();
    return strategy;
  }

  async updateStrategy(id: string, updates: Partial<Strategy>): Promise<Strategy> {
    const [strategy] = await db.update(strategies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(strategies.id, id))
      .returning();
    return strategy;
  }

  async deleteStrategy(id: string): Promise<void> {
    await db.delete(strategies).where(eq(strategies.id, id));
  }

  // Backtests
  async getBacktests(userId: string): Promise<(Backtest & { strategy: Strategy; symbol: Symbol })[]> {
    return await db.select({
      id: backtests.id,
      userId: backtests.userId,
      strategyId: backtests.strategyId,
      symbolId: backtests.symbolId,
      startDate: backtests.startDate,
      endDate: backtests.endDate,
      initialCapital: backtests.initialCapital,
      finalCapital: backtests.finalCapital,
      totalReturn: backtests.totalReturn,
      sharpeRatio: backtests.sharpeRatio,
      maxDrawdown: backtests.maxDrawdown,
      winRate: backtests.winRate,
      results: backtests.results,
      createdAt: backtests.createdAt,
      strategy: strategies,
      symbol: symbols
    })
    .from(backtests)
    .innerJoin(strategies, eq(backtests.strategyId, strategies.id))
    .innerJoin(symbols, eq(backtests.symbolId, symbols.id))
    .where(eq(backtests.userId, userId));
  }

  async createBacktest(insertBacktest: InsertBacktest): Promise<Backtest> {
    const [backtest] = await db.insert(backtests).values(insertBacktest).returning();
    return backtest;
  }

  async updateBacktest(id: string, updates: Partial<Backtest>): Promise<Backtest> {
    const [backtest] = await db.update(backtests)
      .set(updates)
      .where(eq(backtests.id, id))
      .returning();
    return backtest;
  }

  // Drawings
  async getDrawings(userId: string, symbolId: string, timeframe: string, options?: { from?: number; to?: number }): Promise<Drawing[]> {
    const conditions = [
      eq(drawings.userId, userId),
      eq(drawings.symbolId, symbolId),
      eq(drawings.timeframe, timeframe)
    ];

    // Add viewport filtering if from/to provided (using bbox for performance)
    if (options?.from !== undefined || options?.to !== undefined) {
      const bboxConditions: any[] = [];
      
      if (options.from !== undefined) {
        // Drawing's t1 (end time) must be >= viewport start (cast to bigint for numeric comparison)
        bboxConditions.push(dSql`(${drawings.bbox}->>'t1')::bigint >= ${options.from}`);
      }
      
      if (options.to !== undefined) {
        // Drawing's t0 (start time) must be <= viewport end (cast to bigint for numeric comparison)
        bboxConditions.push(dSql`(${drawings.bbox}->>'t0')::bigint <= ${options.to}`);
      }
      
      if (bboxConditions.length > 0) {
        conditions.push(and(...bboxConditions) as any);
      }
    }

    return await db.select()
      .from(drawings)
      .where(and(...conditions))
      .orderBy(desc(drawings.createdAt));
  }

  async getDrawing(id: string): Promise<Drawing | undefined> {
    const [drawing] = await db.select().from(drawings).where(eq(drawings.id, id));
    return drawing;
  }

  async createDrawing(insertDrawing: InsertDrawing): Promise<Drawing> {
    const [drawing] = await db.insert(drawings).values(insertDrawing).returning();
    return drawing;
  }

  async updateDrawing(id: string, updates: UpdateDrawing): Promise<Drawing> {
    const [drawing] = await db.update(drawings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(drawings.id, id))
      .returning();
    return drawing;
  }

  async deleteDrawing(id: string): Promise<void> {
    await db.delete(drawings).where(eq(drawings.id, id));
  }
}

// Switch to DatabaseStorage for persistence
export const storage = new DatabaseStorage();
