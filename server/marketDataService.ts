import { storage } from "./storage";
import type { Symbol as TradingSymbol } from "@shared/schema";

type CoinGeckoOHLCResponse = [number, number, number, number, number];

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

const symbolToCoinGeckoId: Record<string, string> = {
  "BTCUSDT": "bitcoin",
  "ETHUSDT": "ethereum",
  "BNBUSDT": "binancecoin",
  "SOLUSDT": "solana",
  "ADAUSDT": "cardano",
  "DOGEUSDT": "dogecoin",
  "XRPUSDT": "ripple",
  "DOTUSDT": "polkadot",
  "AVAXUSDT": "avalanche-2",
  "MATICUSDT": "matic-network"
};

const timeframeToGeckoDays: Record<string, number> = {
  "1m": 1,
  "5m": 1,
  "15m": 1,
  "1h": 7,
  "4h": 30,
  "1d": 90,
  "1w": 365,
  "1M": 365
};

export class MarketDataService {
  private fetchInProgress: Set<string> = new Set();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly FETCH_COOLDOWN = 60000; // 1 minute cooldown between fetches

  async fetchAndStoreMarketData(symbol: TradingSymbol, timeframe: string): Promise<void> {
    const key = `${symbol.id}_${timeframe}`;
    
    // Check if fetch is already in progress
    if (this.fetchInProgress.has(key)) {
      console.log(`Fetch already in progress for ${symbol.symbol} ${timeframe}`);
      return;
    }
    
    // Check cooldown
    const lastFetch = this.lastFetchTime.get(key) || 0;
    if (Date.now() - lastFetch < this.FETCH_COOLDOWN) {
      console.log(`Cooldown active for ${symbol.symbol} ${timeframe}`);
      return;
    }
    
    this.fetchInProgress.add(key);
    this.lastFetchTime.set(key, Date.now());
    
    try {
      // Only fetch for crypto symbols
      if (symbol.type !== "crypto") {
        console.log(`Skipping non-crypto symbol ${symbol.symbol}`);
        return;
      }
      
      const geckoId = symbolToCoinGeckoId[symbol.symbol];
      if (!geckoId) {
        console.log(`No CoinGecko mapping for ${symbol.symbol}`);
        return;
      }
      
      const days = timeframeToGeckoDays[timeframe] || 7;
      const url = `${COINGECKO_BASE_URL}/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`;
      
      console.log(`Fetching market data from CoinGecko: ${symbol.symbol} ${timeframe}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }
      
      const data: CoinGeckoOHLCResponse[] = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`No data returned for ${symbol.symbol}`);
        return;
      }
      
      // Store candles in database
      let stored = 0;
      for (const candle of data) {
        try {
          await storage.insertMarketData({
            symbolId: symbol.id,
            timestamp: new Date(candle[0]),
            open: candle[1].toString(),
            high: candle[2].toString(),
            low: candle[3].toString(),
            close: candle[4].toString(),
            volume: "0", // CoinGecko OHLC endpoint doesn't provide volume
            timeframe
          });
          stored++;
        } catch (error) {
          // Skip duplicates silently
        }
      }
      
      console.log(`Stored ${stored} candles for ${symbol.symbol} ${timeframe}`);
    } catch (error) {
      console.error(`Error fetching market data for ${symbol.symbol}:`, error);
    } finally {
      this.fetchInProgress.delete(key);
    }
  }
  
  async ensureMarketDataExists(symbolId: string, timeframe: string): Promise<void> {
    // Check if we have recent data
    const existingData = await storage.getMarketData(symbolId, timeframe, 10);
    
    if (existingData.length === 0) {
      // No data exists, fetch it
      const symbol = await storage.getSymbol(symbolId);
      if (symbol) {
        await this.fetchAndStoreMarketData(symbol, timeframe);
      }
    }
  }
  
  async seedInitialMarketData(): Promise<void> {
    console.log("Seeding initial market data from CoinGecko...");
    
    const symbols = await storage.getSymbols();
    const cryptoSymbols = symbols.filter(s => s.type === "crypto");
    
    const timeframes = ["1h", "1d"];
    
    for (const symbol of cryptoSymbols) {
      for (const timeframe of timeframes) {
        await this.fetchAndStoreMarketData(symbol, timeframe);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log("Initial market data seeding completed");
  }
}

export const marketDataService = new MarketDataService();
