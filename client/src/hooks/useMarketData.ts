import { useState, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";

export function useMarketData(symbol: string, timeframe: string = '1h') {
  const [currentPrice, setCurrentPrice] = useState(43250.78);
  const [priceChange, setPriceChange] = useState(550.89);
  const [priceChangePercent, setPriceChangePercent] = useState(2.34);
  const [candlestickData, setCandlestickData] = useState<any[]>([]);

  const { lastMessage, sendMessage } = useWebSocket('/ws');

  useEffect(() => {
    // Subscribe to symbol updates
    if (symbol) {
      sendMessage({
        type: 'subscribe',
        symbol,
        timeframe,
      });
    }

    return () => {
      if (symbol) {
        sendMessage({
          type: 'unsubscribe',
          symbol,
        });
      }
    };
  }, [symbol, timeframe, sendMessage]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'price_update' && lastMessage.symbol === symbol) {
      const newPrice = parseFloat(lastMessage.price);
      const change = parseFloat(lastMessage.change);
      
      setCurrentPrice(newPrice);
      setPriceChange(change);
      setPriceChangePercent((change / newPrice) * 100);
    }
  }, [lastMessage, symbol]);

  // Generate sample candlestick data
  useEffect(() => {
    const generateCandlestickData = () => {
      const data = [];
      const baseTime = new Date().getTime() - (100 * 60 * 60 * 1000); // 100 hours ago
      let currentPrice = 42000;

      for (let i = 0; i < 100; i++) {
        const time = (baseTime + (i * 60 * 60 * 1000)) / 1000; // Convert to seconds
        const change = (Math.random() - 0.5) * 1000;
        const open = currentPrice;
        const high = open + Math.random() * 500;
        const low = open - Math.random() * 500;
        const close = open + change;
        
        data.push({
          time,
          open,
          high: Math.max(open, close, high),
          low: Math.min(open, close, low),
          close,
        });
        
        currentPrice = close;
      }
      
      return data;
    };

    setCandlestickData(generateCandlestickData());
  }, [symbol, timeframe]);

  return {
    currentPrice,
    priceChange,
    priceChangePercent,
    candlestickData,
  };
}
