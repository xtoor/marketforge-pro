#!/usr/bin/env python3
"""
MarketForge Pro - Python Strategy Engine
Executes trading strategies with technical analysis capabilities
"""

import sys
import json
import pandas as pd
import numpy as np
from typing import Dict, List, Any
import asyncio
import warnings
warnings.filterwarnings('ignore')

class StrategyEngine:
    def __init__(self):
        self.indicators = {}
        self.signals = []
        
    def execute_strategy(self, strategy_code: str, market_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a Python trading strategy
        
        Args:
            strategy_code: Python code string containing the strategy
            market_data: Optional market data for backtesting
            
        Returns:
            Dictionary containing execution results
        """
        try:
            # Create a safe execution environment
            safe_globals = {
                '__builtins__': {
                    'print': print,
                    'len': len,
                    'range': range,
                    'enumerate': enumerate,
                    'zip': zip,
                    'min': min,
                    'max': max,
                    'abs': abs,
                    'round': round,
                    'sum': sum,
                },
                'pd': pd,
                'np': np,
                'indicators': self.indicators,
                'signals': self.signals,
            }
            
            # Add market data if provided
            if market_data:
                safe_globals['market_data'] = market_data
                
            # Execute the strategy code
            exec(strategy_code, safe_globals)
            
            return {
                'status': 'success',
                'indicators': self.indicators,
                'signals': self.signals,
                'message': 'Strategy executed successfully'
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'message': f'Strategy execution failed: {str(e)}'
            }
    
    def add_indicator(self, name: str, values: List[float]):
        """Add calculated indicator values"""
        self.indicators[name] = values
        
    def add_signal(self, signal_type: str, timestamp: str, price: float, reason: str):
        """Add trading signal"""
        self.signals.append({
            'type': signal_type,
            'timestamp': timestamp,
            'price': price,
            'reason': reason
        })

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No strategy code provided'}))
        return
    
    strategy_code = sys.argv[1]
    engine = StrategyEngine()
    
    # Sample market data for testing
    sample_data = {
        'prices': np.random.normal(100, 10, 100).tolist(),
        'volumes': np.random.uniform(1000, 10000, 100).tolist(),
        'timestamps': pd.date_range('2024-01-01', periods=100, freq='H').strftime('%Y-%m-%d %H:%M:%S').tolist()
    }
    
    result = engine.execute_strategy(strategy_code, sample_data)
    print(json.dumps(result))

if __name__ == '__main__':
    main()
