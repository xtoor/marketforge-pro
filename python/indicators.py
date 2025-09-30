#!/usr/bin/env python3
"""
MarketForge Pro - Technical Indicators Library
Comprehensive collection of technical analysis indicators
"""

import pandas as pd
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
import warnings
warnings.filterwarnings('ignore')

class TechnicalIndicators:
    """
    A comprehensive technical analysis indicators library
    """
    
    @staticmethod
    def sma(data: List[float], period: int = 20) -> List[float]:
        """
        Simple Moving Average
        
        Args:
            data: Price data
            period: Period for moving average
            
        Returns:
            List of SMA values
        """
        if len(data) < period:
            return [np.nan] * len(data)
        
        df = pd.Series(data)
        sma_values = df.rolling(window=period).mean()
        return sma_values.fillna(np.nan).tolist()
    
    @staticmethod
    def ema(data: List[float], period: int = 20) -> List[float]:
        """
        Exponential Moving Average
        
        Args:
            data: Price data
            period: Period for moving average
            
        Returns:
            List of EMA values
        """
        if len(data) < period:
            return [np.nan] * len(data)
        
        df = pd.Series(data)
        ema_values = df.ewm(span=period, adjust=False).mean()
        return ema_values.fillna(np.nan).tolist()
    
    @staticmethod
    def rsi(data: List[float], period: int = 14) -> List[float]:
        """
        Relative Strength Index
        
        Args:
            data: Price data
            period: Period for RSI calculation
            
        Returns:
            List of RSI values (0-100)
        """
        if len(data) < period + 1:
            return [np.nan] * len(data)
        
        df = pd.Series(data)
        delta = df.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(np.nan).tolist()
    
    @staticmethod
    def macd(data: List[float], fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Dict[str, List[float]]:
        """
        Moving Average Convergence Divergence
        
        Args:
            data: Price data
            fast_period: Fast EMA period
            slow_period: Slow EMA period
            signal_period: Signal line EMA period
            
        Returns:
            Dictionary with 'macd', 'signal', and 'histogram' lists
        """
        if len(data) < slow_period:
            nan_list = [np.nan] * len(data)
            return {'macd': nan_list, 'signal': nan_list, 'histogram': nan_list}
        
        df = pd.Series(data)
        ema_fast = df.ewm(span=fast_period).mean()
        ema_slow = df.ewm(span=slow_period).mean()
        
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal_period).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line.fillna(np.nan).tolist(),
            'signal': signal_line.fillna(np.nan).tolist(),
            'histogram': histogram.fillna(np.nan).tolist()
        }
    
    @staticmethod
    def bollinger_bands(data: List[float], period: int = 20, std_dev: float = 2.0) -> Dict[str, List[float]]:
        """
        Bollinger Bands
        
        Args:
            data: Price data
            period: Period for moving average
            std_dev: Standard deviation multiplier
            
        Returns:
            Dictionary with 'upper', 'middle', and 'lower' bands
        """
        if len(data) < period:
            nan_list = [np.nan] * len(data)
            return {'upper': nan_list, 'middle': nan_list, 'lower': nan_list}
        
        df = pd.Series(data)
        middle = df.rolling(window=period).mean()
        std = df.rolling(window=period).std()
        
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        
        return {
            'upper': upper.fillna(np.nan).tolist(),
            'middle': middle.fillna(np.nan).tolist(),
            'lower': lower.fillna(np.nan).tolist()
        }
    
    @staticmethod
    def stochastic(high: List[float], low: List[float], close: List[float], 
                  k_period: int = 14, d_period: int = 3) -> Dict[str, List[float]]:
        """
        Stochastic Oscillator
        
        Args:
            high: High prices
            low: Low prices
            close: Close prices
            k_period: %K period
            d_period: %D period
            
        Returns:
            Dictionary with '%K' and '%D' values
        """
        if len(close) < k_period:
            nan_list = [np.nan] * len(close)
            return {'%K': nan_list, '%D': nan_list}
        
        df = pd.DataFrame({'high': high, 'low': low, 'close': close})
        
        lowest_low = df['low'].rolling(window=k_period).min()
        highest_high = df['high'].rolling(window=k_period).max()
        
        k_percent = 100 * ((df['close'] - lowest_low) / (highest_high - lowest_low))
        d_percent = k_percent.rolling(window=d_period).mean()
        
        return {
            '%K': k_percent.fillna(np.nan).tolist(),
            '%D': d_percent.fillna(np.nan).tolist()
        }
    
    @staticmethod
    def atr(high: List[float], low: List[float], close: List[float], period: int = 14) -> List[float]:
        """
        Average True Range
        
        Args:
            high: High prices
            low: Low prices
            close: Close prices
            period: Period for ATR calculation
            
        Returns:
            List of ATR values
        """
        if len(close) < period + 1:
            return [np.nan] * len(close)
        
        df = pd.DataFrame({'high': high, 'low': low, 'close': close})
        
        # Calculate True Range
        df['prev_close'] = df['close'].shift(1)
        df['tr1'] = df['high'] - df['low']
        df['tr2'] = abs(df['high'] - df['prev_close'])
        df['tr3'] = abs(df['low'] - df['prev_close'])
        df['tr'] = df[['tr1', 'tr2', 'tr3']].max(axis=1)
        
        # Calculate ATR
        atr_values = df['tr'].rolling(window=period).mean()
        return atr_values.fillna(np.nan).tolist()
    
    @staticmethod
    def williams_r(high: List[float], low: List[float], close: List[float], period: int = 14) -> List[float]:
        """
        Williams %R
        
        Args:
            high: High prices
            low: Low prices
            close: Close prices
            period: Period for calculation
            
        Returns:
            List of Williams %R values (-100 to 0)
        """
        if len(close) < period:
            return [np.nan] * len(close)
        
        df = pd.DataFrame({'high': high, 'low': low, 'close': close})
        
        highest_high = df['high'].rolling(window=period).max()
        lowest_low = df['low'].rolling(window=period).min()
        
        williams_r = -100 * ((highest_high - df['close']) / (highest_high - lowest_low))
        return williams_r.fillna(np.nan).tolist()
    
    @staticmethod
    def cci(high: List[float], low: List[float], close: List[float], period: int = 20) -> List[float]:
        """
        Commodity Channel Index
        
        Args:
            high: High prices
            low: Low prices
            close: Close prices
            period: Period for calculation
            
        Returns:
            List of CCI values
        """
        if len(close) < period:
            return [np.nan] * len(close)
        
        df = pd.DataFrame({'high': high, 'low': low, 'close': close})
        
        # Typical Price
        tp = (df['high'] + df['low'] + df['close']) / 3
        
        # Simple Moving Average of Typical Price
        sma_tp = tp.rolling(window=period).mean()
        
        # Mean Deviation
        mean_dev = tp.rolling(window=period).apply(lambda x: np.mean(np.abs(x - x.mean())))
        
        # CCI
        cci = (tp - sma_tp) / (0.015 * mean_dev)
        return cci.fillna(np.nan).tolist()
    
    @staticmethod
    def adx(high: List[float], low: List[float], close: List[float], period: int = 14) -> Dict[str, List[float]]:
        """
        Average Directional Index
        
        Args:
            high: High prices
            low: Low prices
            close: Close prices
            period: Period for calculation
            
        Returns:
            Dictionary with 'adx', 'di_plus', and 'di_minus' values
        """
        if len(close) < period * 2:
            nan_list = [np.nan] * len(close)
            return {'adx': nan_list, 'di_plus': nan_list, 'di_minus': nan_list}
        
        df = pd.DataFrame({'high': high, 'low': low, 'close': close})
        
        # True Range
        df['prev_close'] = df['close'].shift(1)
        df['tr'] = np.maximum(
            df['high'] - df['low'],
            np.maximum(
                abs(df['high'] - df['prev_close']),
                abs(df['low'] - df['prev_close'])
            )
        )
        
        # Directional Movement
        df['dm_plus'] = np.where(
            (df['high'] - df['high'].shift(1)) > (df['low'].shift(1) - df['low']),
            np.maximum(df['high'] - df['high'].shift(1), 0),
            0
        )
        df['dm_minus'] = np.where(
            (df['low'].shift(1) - df['low']) > (df['high'] - df['high'].shift(1)),
            np.maximum(df['low'].shift(1) - df['low'], 0),
            0
        )
        
        # Smoothed values
        atr = df['tr'].rolling(window=period).mean()
        dm_plus_smooth = df['dm_plus'].rolling(window=period).mean()
        dm_minus_smooth = df['dm_minus'].rolling(window=period).mean()
        
        # Directional Indicators
        di_plus = 100 * (dm_plus_smooth / atr)
        di_minus = 100 * (dm_minus_smooth / atr)
        
        # ADX
        dx = 100 * abs(di_plus - di_minus) / (di_plus + di_minus)
        adx = dx.rolling(window=period).mean()
        
        return {
            'adx': adx.fillna(np.nan).tolist(),
            'di_plus': di_plus.fillna(np.nan).tolist(),
            'di_minus': di_minus.fillna(np.nan).tolist()
        }
    
    @staticmethod
    def obv(close: List[float], volume: List[float]) -> List[float]:
        """
        On Balance Volume
        
        Args:
            close: Close prices
            volume: Volume data
            
        Returns:
            List of OBV values
        """
        if len(close) != len(volume) or len(close) < 2:
            return [np.nan] * len(close)
        
        df = pd.DataFrame({'close': close, 'volume': volume})
        
        # Price change direction
        df['price_change'] = df['close'].diff()
        df['direction'] = np.where(df['price_change'] > 0, 1, 
                                 np.where(df['price_change'] < 0, -1, 0))
        
        # OBV calculation
        df['obv'] = (df['direction'] * df['volume']).cumsum()
        
        return df['obv'].fillna(np.nan).tolist()
    
    @staticmethod
    def fibonacci_retracement(high_price: float, low_price: float) -> Dict[str, float]:
        """
        Fibonacci Retracement Levels
        
        Args:
            high_price: Highest price in the range
            low_price: Lowest price in the range
            
        Returns:
            Dictionary with fibonacci levels
        """
        diff = high_price - low_price
        
        levels = {
            '0%': high_price,
            '23.6%': high_price - (diff * 0.236),
            '38.2%': high_price - (diff * 0.382),
            '50%': high_price - (diff * 0.5),
            '61.8%': high_price - (diff * 0.618),
            '78.6%': high_price - (diff * 0.786),
            '100%': low_price
        }
        
        return levels
    
    @staticmethod
    def pivot_points(high: float, low: float, close: float) -> Dict[str, float]:
        """
        Pivot Points and Support/Resistance levels
        
        Args:
            high: Previous period high
            low: Previous period low
            close: Previous period close
            
        Returns:
            Dictionary with pivot levels
        """
        pivot = (high + low + close) / 3
        
        levels = {
            'pivot': pivot,
            'r1': (2 * pivot) - low,
            'r2': pivot + (high - low),
            'r3': high + 2 * (pivot - low),
            's1': (2 * pivot) - high,
            's2': pivot - (high - low),
            's3': low - 2 * (high - pivot)
        }
        
        return levels
    
    @staticmethod
    def detect_candlestick_patterns(open_prices: List[float], high_prices: List[float], 
                                   low_prices: List[float], close_prices: List[float]) -> Dict[str, List[bool]]:
        """
        Detect common candlestick patterns
        
        Args:
            open_prices: Open prices
            high_prices: High prices
            low_prices: Low prices
            close_prices: Close prices
            
        Returns:
            Dictionary with pattern detection results
        """
        if len(open_prices) < 3:
            empty_result = [False] * len(open_prices)
            return {
                'doji': empty_result,
                'hammer': empty_result,
                'shooting_star': empty_result,
                'engulfing_bullish': empty_result,
                'engulfing_bearish': empty_result,
                'morning_star': empty_result,
                'evening_star': empty_result
            }
        
        df = pd.DataFrame({
            'open': open_prices,
            'high': high_prices,
            'low': low_prices,
            'close': close_prices
        })
        
        # Calculate body and shadow sizes
        df['body'] = abs(df['close'] - df['open'])
        df['upper_shadow'] = df['high'] - np.maximum(df['open'], df['close'])
        df['lower_shadow'] = np.minimum(df['open'], df['close']) - df['low']
        df['range'] = df['high'] - df['low']
        
        patterns = {}
        
        # Doji
        patterns['doji'] = (df['body'] <= df['range'] * 0.1).tolist()
        
        # Hammer
        hammer_condition = (
            (df['lower_shadow'] >= df['body'] * 2) &
            (df['upper_shadow'] <= df['body'] * 0.1) &
            (df['body'] > 0)
        )
        patterns['hammer'] = hammer_condition.tolist()
        
        # Shooting Star
        shooting_star_condition = (
            (df['upper_shadow'] >= df['body'] * 2) &
            (df['lower_shadow'] <= df['body'] * 0.1) &
            (df['body'] > 0)
        )
        patterns['shooting_star'] = shooting_star_condition.tolist()
        
        # Bullish Engulfing
        engulfing_bull = [False] * len(df)
        for i in range(1, len(df)):
            if (df.iloc[i-1]['close'] < df.iloc[i-1]['open'] and  # Previous candle bearish
                df.iloc[i]['close'] > df.iloc[i]['open'] and      # Current candle bullish
                df.iloc[i]['open'] < df.iloc[i-1]['close'] and    # Current open below prev close
                df.iloc[i]['close'] > df.iloc[i-1]['open']):      # Current close above prev open
                engulfing_bull[i] = True
        patterns['engulfing_bullish'] = engulfing_bull
        
        # Bearish Engulfing
        engulfing_bear = [False] * len(df)
        for i in range(1, len(df)):
            if (df.iloc[i-1]['close'] > df.iloc[i-1]['open'] and  # Previous candle bullish
                df.iloc[i]['close'] < df.iloc[i]['open'] and      # Current candle bearish
                df.iloc[i]['open'] > df.iloc[i-1]['close'] and    # Current open above prev close
                df.iloc[i]['close'] < df.iloc[i-1]['open']):      # Current close below prev open
                engulfing_bear[i] = True
        patterns['engulfing_bearish'] = engulfing_bear
        
        # Morning Star (simplified)
        morning_star = [False] * len(df)
        for i in range(2, len(df)):
            if (df.iloc[i-2]['close'] < df.iloc[i-2]['open'] and  # First candle bearish
                abs(df.iloc[i-1]['close'] - df.iloc[i-1]['open']) < df.iloc[i-1]['range'] * 0.3 and  # Middle doji-like
                df.iloc[i]['close'] > df.iloc[i]['open'] and      # Third candle bullish
                df.iloc[i]['close'] > (df.iloc[i-2]['open'] + df.iloc[i-2]['close']) / 2):  # Close above midpoint
                morning_star[i] = True
        patterns['morning_star'] = morning_star
        
        # Evening Star (simplified)
        evening_star = [False] * len(df)
        for i in range(2, len(df)):
            if (df.iloc[i-2]['close'] > df.iloc[i-2]['open'] and  # First candle bullish
                abs(df.iloc[i-1]['close'] - df.iloc[i-1]['open']) < df.iloc[i-1]['range'] * 0.3 and  # Middle doji-like
                df.iloc[i]['close'] < df.iloc[i]['open'] and      # Third candle bearish
                df.iloc[i]['close'] < (df.iloc[i-2]['open'] + df.iloc[i-2]['close']) / 2):  # Close below midpoint
                evening_star[i] = True
        patterns['evening_star'] = evening_star
        
        return patterns


# Convenience functions for easy access
def calculate_sma(data: List[float], period: int = 20) -> List[float]:
    """Calculate Simple Moving Average"""
    return TechnicalIndicators.sma(data, period)

def calculate_ema(data: List[float], period: int = 20) -> List[float]:
    """Calculate Exponential Moving Average"""
    return TechnicalIndicators.ema(data, period)

def calculate_rsi(data: List[float], period: int = 14) -> List[float]:
    """Calculate RSI"""
    return TechnicalIndicators.rsi(data, period)

def calculate_macd(data: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, List[float]]:
    """Calculate MACD"""
    return TechnicalIndicators.macd(data, fast, slow, signal)

def calculate_bollinger_bands(data: List[float], period: int = 20, std_dev: float = 2.0) -> Dict[str, List[float]]:
    """Calculate Bollinger Bands"""
    return TechnicalIndicators.bollinger_bands(data, period, std_dev)

# Example usage and testing
if __name__ == '__main__':
    # Test with sample data
    sample_prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113]
    sample_high = [102, 104, 103, 105, 107, 106, 108, 110, 109, 111, 113, 112, 114, 116, 115]
    sample_low = [98, 100, 99, 101, 103, 102, 104, 106, 105, 107, 109, 108, 110, 112, 111]
    sample_volume = [1000, 1200, 800, 1500, 1100, 900, 1300, 1400, 1000, 1600, 1200, 1100, 1500, 1300, 1000]
    
    # Test indicators
    print("Testing Technical Indicators:")
    print(f"SMA(10): {TechnicalIndicators.sma(sample_prices, 10)[-5:]}")
    print(f"EMA(10): {TechnicalIndicators.ema(sample_prices, 10)[-5:]}")
    print(f"RSI(14): {TechnicalIndicators.rsi(sample_prices, 14)[-5:]}")
    
    macd_result = TechnicalIndicators.macd(sample_prices)
    print(f"MACD: {macd_result['macd'][-3:]}")
    
    bb_result = TechnicalIndicators.bollinger_bands(sample_prices)
    print(f"BB Upper: {bb_result['upper'][-3:]}")
