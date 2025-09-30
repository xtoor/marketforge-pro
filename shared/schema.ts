import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const symbols = pgTable("symbols", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'crypto', 'stock', 'forex', 'commodity'
  exchange: text("exchange"),
  isActive: boolean("is_active").default(true),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbolId: varchar("symbol_id").references(() => symbols.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: decimal("open", { precision: 20, scale: 8 }).notNull(),
  high: decimal("high", { precision: 20, scale: 8 }).notNull(),
  low: decimal("low", { precision: 20, scale: 8 }).notNull(),
  close: decimal("close", { precision: 20, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 8 }).notNull(),
  timeframe: text("timeframe").notNull(), // '1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'
}, (table) => ({
  symbolTimeframeIdx: index("market_data_symbol_timeframe_idx").on(table.symbolId, table.timeframe, table.timestamp.desc()),
  uniqueCandle: uniqueIndex("market_data_unique_candle_idx").on(table.symbolId, table.timeframe, table.timestamp),
}));

export const watchlists = pgTable("watchlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbolId: varchar("symbol_id").references(() => symbols.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userSymbolIdx: uniqueIndex("watchlists_user_symbol_idx").on(table.userId, table.symbolId),
}));

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbolId: varchar("symbol_id").references(() => symbols.id).notNull(),
  side: text("side").notNull(), // 'buy', 'sell'
  type: text("type").notNull(), // 'market', 'limit', 'stop'
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }),
  stopPrice: decimal("stop_price", { precision: 20, scale: 8 }),
  status: text("status").notNull().default('pending'), // 'pending', 'filled', 'cancelled', 'partial'
  filledQuantity: decimal("filled_quantity", { precision: 20, scale: 8 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userCreatedIdx: index("orders_user_created_idx").on(table.userId, table.createdAt.desc()),
}));

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbolId: varchar("symbol_id").references(() => symbols.id).notNull(),
  side: text("side").notNull(), // 'long', 'short'
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }).notNull(),
  markPrice: decimal("mark_price", { precision: 20, scale: 8 }),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("positions_user_idx").on(table.userId),
}));

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbolId: varchar("symbol_id").references(() => symbols.id).notNull(),
  type: text("type").notNull(), // 'price', 'indicator'
  condition: text("condition").notNull(), // 'above', 'below', 'crosses_above', 'crosses_below'
  value: decimal("value", { precision: 20, scale: 8 }).notNull(),
  indicator: text("indicator"), // 'rsi', 'macd', 'ma'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const strategies = pgTable("strategies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  pythonCode: text("python_code").notNull(),
  parameters: jsonb("parameters"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const backtests = pgTable("backtests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  strategyId: varchar("strategy_id").references(() => strategies.id),
  symbolId: varchar("symbol_id").references(() => symbols.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  initialCapital: decimal("initial_capital", { precision: 20, scale: 2 }).notNull(),
  finalCapital: decimal("final_capital", { precision: 20, scale: 2 }),
  totalReturn: decimal("total_return", { precision: 10, scale: 4 }),
  sharpeRatio: decimal("sharpe_ratio", { precision: 10, scale: 4 }),
  maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 4 }),
  winRate: decimal("win_rate", { precision: 10, scale: 4 }),
  results: jsonb("results"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drawings = pgTable("drawings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  symbolId: varchar("symbol_id").references(() => symbols.id).notNull(),
  timeframe: text("timeframe").notNull(), // '1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'
  type: text("type").notNull(), // 'horizontal', 'trendline', 'fibonacci', etc.
  points: jsonb("points").notNull(), // [{time: number, price: number}, ...]
  style: jsonb("style").notNull(), // {color: string, width: number, label?: string, visible: boolean}
  bbox: jsonb("bbox"), // {t0: number, t1: number, pMin: number, pMax: number} for viewport filtering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userSymbolTimeframeIdx: index("drawings_user_symbol_timeframe_idx").on(table.userId, table.symbolId, table.timeframe, table.createdAt.desc()),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertSymbolSchema = createInsertSchema(symbols).omit({ id: true });
export const insertMarketDataSchema = createInsertSchema(marketData).omit({ id: true });
export const insertWatchlistSchema = createInsertSchema(watchlists).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  filledQuantity: true,
  status: true 
});
export const insertPositionSchema = createInsertSchema(positions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  markPrice: true,
  pnl: true 
});
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertStrategySchema = createInsertSchema(strategies).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertBacktestSchema = createInsertSchema(backtests).omit({ 
  id: true, 
  createdAt: true,
  finalCapital: true,
  totalReturn: true,
  sharpeRatio: true,
  maxDrawdown: true,
  winRate: true,
  results: true 
});
// Base schema from Drizzle
const baseInsertDrawingSchema = createInsertSchema(drawings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Extended schema with proper JSONB validation
export const insertDrawingSchema = baseInsertDrawingSchema.extend({
  points: z.array(z.object({
    time: z.number(),
    price: z.number()
  })),
  style: z.object({
    color: z.string(),
    width: z.number().optional(),
    label: z.string().optional(),
    visible: z.boolean().optional()
  }),
  bbox: z.object({
    t0: z.number(),
    t1: z.number(),
    pMin: z.number(),
    pMax: z.number()
  }).optional()
});

export const updateDrawingSchema = insertDrawingSchema.partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Symbol = typeof symbols.$inferSelect;
export type InsertSymbol = z.infer<typeof insertSymbolSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type Watchlist = typeof watchlists.$inferSelect;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Strategy = typeof strategies.$inferSelect;
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type Backtest = typeof backtests.$inferSelect;
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
export type Drawing = typeof drawings.$inferSelect;
export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type UpdateDrawing = z.infer<typeof updateDrawingSchema>;
