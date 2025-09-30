#!/usr/bin/env python3
"""
MarketForge Pro - Indicator Calculator API Wrapper
Calculates technical indicators and returns JSON results
"""

import sys
import json
from indicators import TechnicalIndicators

def calculate_indicator(indicator_input):
    """
    Calculate technical indicator based on input data
    
    Args:
        indicator_input: Dictionary with type, data, and params
        
    Returns:
        Dictionary with indicator results
    """
    try:
        indicator_type = indicator_input.get('type', '').lower()
        data = indicator_input.get('data', {})
        params = indicator_input.get('params', {})
        
        # Extract OHLCV data
        close_prices = data.get('close', [])
        high_prices = data.get('high', [])
        low_prices = data.get('low', [])
        open_prices = data.get('open', [])
        volume = data.get('volume', [])
        
        result = {}
        
        # Calculate requested indicator
        if indicator_type == 'sma':
            period = int(params.get('period', 20))
            result['values'] = TechnicalIndicators.sma(close_prices, period)
            result['period'] = period
            
        elif indicator_type == 'ema':
            period = int(params.get('period', 20))
            result['values'] = TechnicalIndicators.ema(close_prices, period)
            result['period'] = period
            
        elif indicator_type == 'rsi':
            period = int(params.get('period', 14))
            result['values'] = TechnicalIndicators.rsi(close_prices, period)
            result['period'] = period
            
        elif indicator_type == 'macd':
            fast = int(params.get('fast', 12))
            slow = int(params.get('slow', 26))
            signal = int(params.get('signal', 9))
            macd_data = TechnicalIndicators.macd(close_prices, fast, slow, signal)
            result.update(macd_data)
            result['fast'] = fast
            result['slow'] = slow
            result['signal_period'] = signal
            
        elif indicator_type == 'bollinger':
            period = int(params.get('period', 20))
            std_dev = float(params.get('stdDev', 2.0))
            bb_data = TechnicalIndicators.bollinger_bands(close_prices, period, std_dev)
            result.update(bb_data)
            result['period'] = period
            result['stdDev'] = std_dev
            
        elif indicator_type == 'stochastic':
            k_period = int(params.get('kPeriod', 14))
            d_period = int(params.get('dPeriod', 3))
            stoch_data = TechnicalIndicators.stochastic(high_prices, low_prices, close_prices, k_period, d_period)
            result.update(stoch_data)
            result['kPeriod'] = k_period
            result['dPeriod'] = d_period
            
        elif indicator_type == 'atr':
            period = int(params.get('period', 14))
            result['values'] = TechnicalIndicators.atr(high_prices, low_prices, close_prices, period)
            result['period'] = period
            
        elif indicator_type == 'adx':
            period = int(params.get('period', 14))
            adx_data = TechnicalIndicators.adx(high_prices, low_prices, close_prices, period)
            result.update(adx_data)
            result['period'] = period
            
        elif indicator_type == 'cci':
            period = int(params.get('period', 20))
            result['values'] = TechnicalIndicators.cci(high_prices, low_prices, close_prices, period)
            result['period'] = period
            
        elif indicator_type == 'williams_r':
            period = int(params.get('period', 14))
            result['values'] = TechnicalIndicators.williams_r(high_prices, low_prices, close_prices, period)
            result['period'] = period
            
        elif indicator_type == 'obv':
            result['values'] = TechnicalIndicators.obv(close_prices, volume)
            
        else:
            return {
                'error': f'Unknown indicator type: {indicator_type}',
                'supported': ['sma', 'ema', 'rsi', 'macd', 'bollinger', 'stochastic', 'atr', 'adx', 'cci', 'williams_r', 'obv']
            }
        
        result['type'] = indicator_type
        result['dataPoints'] = len(close_prices)
        
        return result
        
    except Exception as e:
        return {
            'error': str(e),
            'type': 'calculation_error'
        }

if __name__ == '__main__':
    try:
        # Read input from command line argument
        if len(sys.argv) < 2:
            print(json.dumps({'error': 'No input data provided'}))
            sys.exit(1)
        
        input_data = json.loads(sys.argv[1])
        result = calculate_indicator(input_data)
        
        # Output result as JSON
        print(json.dumps(result))
        sys.exit(0)
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON input: {str(e)}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Unexpected error: {str(e)}'}))
        sys.exit(1)
