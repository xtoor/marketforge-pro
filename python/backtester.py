#!/usr/bin/env python3
"""
MarketForge Pro - Backtesting Engine
Advanced backtesting framework for trading strategies
"""

import sys
import json
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import warnings
from indicators import TechnicalIndicators
warnings.filterwarnings('ignore')

class Trade:
    """Represents a single trade"""
    def __init__(self, entry_time: str, entry_price: float, side: str, quantity: float):
        self.entry_time = entry_time
        self.entry_price = entry_price
        self.side = side  # 'buy' or 'sell'
        self.quantity = quantity
        self.exit_time: Optional[str] = None
        self.exit_price: Optional[float] = None
        self.pnl: Optional[float] = None
        self.return_pct: Optional[float] = None
        self.duration: Optional[int] = None  # in periods
        
    def close_trade(self, exit_time: str, exit_price: float):
        """Close the trade and calculate P&L"""
        self.exit_time = exit_time
        self.exit_price = exit_price
        
        if self.side == 'buy':
            self.pnl = (exit_price - self.entry_price) * self.quantity
            self.return_pct = ((exit_price - self.entry_price) / self.entry_price) * 100
        else:  # sell/short
            self.pnl = (self.entry_price - exit_price) * self.quantity
            self.return_pct = ((self.entry_price - exit_price) / self.entry_price) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trade to dictionary"""
        return {
            'entry_time': self.entry_time,
            'entry_price': self.entry_price,
            'exit_time': self.exit_time,
            'exit_price': self.exit_price,
            'side': self.side,
            'quantity': self.quantity,
            'pnl': self.pnl,
            'return_pct': self.return_pct,
            'duration': self.duration
        }

class Portfolio:
    """Portfolio management for backtesting"""
    def __init__(self, initial_capital: float, commission: float = 0.001):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.commission = commission  # Commission as percentage (0.001 = 0.1%)
        self.trades: List[Trade] = []
        self.open_positions: List[Trade] = []
        self.equity_curve: List[float] = [initial_capital]
        self.drawdown_curve: List[float] = [0.0]
        self.peak_capital = initial_capital
        
    def enter_position(self, timestamp: str, price: float, side: str, quantity: float) -> bool:
        """Enter a new position"""
        position_value = price * quantity
        commission_cost = position_value * self.commission
        total_cost = position_value + commission_cost
        
        if total_cost > self.current_capital:
            return False  # Insufficient capital
        
        trade = Trade(timestamp, price, side, quantity)
        self.open_positions.append(trade)
        self.current_capital -= total_cost
        
        return True
    
    def exit_position(self, timestamp: str, price: float, position_index: int = 0) -> bool:
        """Exit a position"""
        if not self.open_positions or position_index >= len(self.open_positions):
            return False
        
        trade = self.open_positions.pop(position_index)
        trade.close_trade(timestamp, price)
        
        position_value = price * trade.quantity
        commission_cost = position_value * self.commission
        net_proceeds = position_value - commission_cost
        
        self.current_capital += net_proceeds
        self.trades.append(trade)
        
        return True
    
    def update_equity(self, current_prices: Dict[str, float]):
        """Update equity curve based on current market prices"""
        total_equity = self.current_capital
        
        # Add unrealized P&L from open positions
        for position in self.open_positions:
            if position.side == 'buy':
                unrealized_pnl = (current_prices.get('close', position.entry_price) - position.entry_price) * position.quantity
            else:
                unrealized_pnl = (position.entry_price - current_prices.get('close', position.entry_price)) * position.quantity
            total_equity += unrealized_pnl
        
        self.equity_curve.append(total_equity)
        
        # Update drawdown
        if total_equity > self.peak_capital:
            self.peak_capital = total_equity
            self.drawdown_curve.append(0.0)
        else:
            drawdown = ((self.peak_capital - total_equity) / self.peak_capital) * 100
            self.drawdown_curve.append(drawdown)
    
    def get_statistics(self) -> Dict[str, float]:
        """Calculate portfolio performance statistics"""
        if not self.trades:
            return {
                'total_return': 0.0,
                'annualized_return': 0.0,
                'sharpe_ratio': 0.0,
                'max_drawdown': 0.0,
                'win_rate': 0.0,
                'profit_factor': 0.0,
                'total_trades': 0,
                'avg_trade_return': 0.0
            }
        
        # Basic metrics
        final_capital = self.equity_curve[-1] if self.equity_curve else self.current_capital
        total_return = ((final_capital - self.initial_capital) / self.initial_capital) * 100
        
        # Trade statistics
        winning_trades = [t for t in self.trades if t.pnl and t.pnl > 0]
        losing_trades = [t for t in self.trades if t.pnl and t.pnl < 0]
        
        win_rate = (len(winning_trades) / len(self.trades)) * 100 if self.trades else 0
        
        # Profit factor
        gross_profit = sum(t.pnl for t in winning_trades if t.pnl)
        gross_loss = abs(sum(t.pnl for t in losing_trades if t.pnl))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        
        # Sharpe ratio (simplified)
        if len(self.equity_curve) > 1:
            returns = np.diff(self.equity_curve) / self.equity_curve[:-1]
            sharpe_ratio = np.mean(returns) / np.std(returns) * np.sqrt(252) if np.std(returns) > 0 else 0
        else:
            sharpe_ratio = 0
        
        # Maximum drawdown
        max_drawdown = max(self.drawdown_curve) if self.drawdown_curve else 0
        
        # Average trade return
        avg_trade_return = np.mean([t.return_pct for t in self.trades if t.return_pct]) if self.trades else 0
        
        return {
            'total_return': total_return,
            'sharpe_ratio': sharpe_ratio,
            'max_drawdown': max_drawdown,
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'total_trades': len(self.trades),
            'avg_trade_return': avg_trade_return,
            'final_capital': final_capital,
            'gross_profit': gross_profit,
            'gross_loss': gross_loss
        }

class Backtester:
    """Main backtesting engine"""
    
    def __init__(self, initial_capital: float = 100000, commission: float = 0.001):
        self.portfolio = Portfolio(initial_capital, commission)
        self.data: Optional[pd.DataFrame] = None
        self.indicators = TechnicalIndicators()
        
    def load_data(self, data: Dict[str, Any]) -> bool:
        """Load market data for backtesting"""
        try:
            # Convert data to DataFrame
            if 'ohlcv' in data:
                # OHLCV format
                df = pd.DataFrame(data['ohlcv'])
                required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            else:
                # Simple price format
                df = pd.DataFrame({
                    'timestamp': data.get('timestamps', []),
                    'close': data.get('prices', []),
                    'volume': data.get('volumes', [])
                })
                # Fill missing OHLC data with close prices
                df['open'] = df['close']
                df['high'] = df['close'] * 1.01  # Approximate high
                df['low'] = df['close'] * 0.99   # Approximate low
                required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
            
            # Validate required columns
            if not all(col in df.columns for col in required_columns):
                return False
            
            # Convert timestamp to datetime if it's string
            if df['timestamp'].dtype == 'object':
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            self.data = df.sort_values('timestamp').reset_index(drop=True)
            return True
            
        except Exception as e:
            print(f"Error loading data: {e}")
            return False
    
    def generate_sample_data(self, start_date: str, end_date: str, symbol: str) -> bool:
        """Generate sample market data for testing"""
        try:
            start = pd.to_datetime(start_date)
            end = pd.to_datetime(end_date)
            
            # Generate hourly data
            timestamps = pd.date_range(start, end, freq='H')
            
            # Generate realistic price movement using random walk
            base_price = 45000  # Starting price for crypto
            returns = np.random.normal(0, 0.02, len(timestamps))  # 2% volatility
            
            prices = [base_price]
            for ret in returns[1:]:
                new_price = prices[-1] * (1 + ret)
                prices.append(max(new_price, prices[-1] * 0.95))  # Prevent extreme drops
            
            # Generate OHLC from prices
            data = []
            for i, (timestamp, close) in enumerate(zip(timestamps, prices)):
                if i == 0:
                    open_price = close
                else:
                    open_price = prices[i-1]
                
                high = max(open_price, close) * (1 + np.random.uniform(0, 0.01))
                low = min(open_price, close) * (1 - np.random.uniform(0, 0.01))
                volume = np.random.uniform(1000, 10000)
                
                data.append({
                    'timestamp': timestamp,
                    'open': open_price,
                    'high': high,
                    'low': low,
                    'close': close,
                    'volume': volume
                })
            
            self.data = pd.DataFrame(data)
            return True
            
        except Exception as e:
            print(f"Error generating sample data: {e}")
            return False
    
    def run_backtest(self, strategy_code: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Run the backtest with given strategy"""
        if self.data is None:
            return {'error': 'No data loaded'}
        
        try:
            # Prepare data for strategy
            df = self.data.copy()
            
            # Calculate common indicators
            df['sma_20'] = self.indicators.sma(df['close'].tolist(), 20)
            df['sma_50'] = self.indicators.sma(df['close'].tolist(), 50)
            df['ema_20'] = self.indicators.ema(df['close'].tolist(), 20)
            df['rsi'] = self.indicators.rsi(df['close'].tolist(), 14)
            
            macd_data = self.indicators.macd(df['close'].tolist())
            df['macd'] = macd_data['macd']
            df['macd_signal'] = macd_data['signal']
            df['macd_histogram'] = macd_data['histogram']
            
            bb_data = self.indicators.bollinger_bands(df['close'].tolist())
            df['bb_upper'] = bb_data['upper']
            df['bb_middle'] = bb_data['middle']
            df['bb_lower'] = bb_data['lower']
            
            # Strategy execution environment
            signals = []
            positions = []
            
            def buy(quantity: float = 1.0, reason: str = ""):
                """Buy signal function"""
                signals.append({
                    'action': 'buy',
                    'timestamp': current_timestamp,
                    'price': current_price,
                    'quantity': quantity,
                    'reason': reason
                })
            
            def sell(quantity: float = 1.0, reason: str = ""):
                """Sell signal function"""
                signals.append({
                    'action': 'sell',
                    'timestamp': current_timestamp,
                    'price': current_price,
                    'quantity': quantity,
                    'reason': reason
                })
            
            def close_all(reason: str = ""):
                """Close all positions"""
                signals.append({
                    'action': 'close_all',
                    'timestamp': current_timestamp,
                    'price': current_price,
                    'reason': reason
                })
            
            # Safe execution environment
            strategy_globals = {
                '__builtins__': {
                    'print': print,
                    'len': len,
                    'range': range,
                    'enumerate': enumerate,
                    'abs': abs,
                    'max': max,
                    'min': min,
                    'round': round,
                },
                'buy': buy,
                'sell': sell,
                'close_all': close_all,
                'pd': pd,
                'np': np,
            }
            
            # Execute strategy for each data point
            for i, row in df.iterrows():
                current_timestamp = row['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                current_price = row['close']
                current_volume = row['volume']
                
                # Make current row data available to strategy
                strategy_globals.update({
                    'current_price': current_price,
                    'current_timestamp': current_timestamp,
                    'current_volume': current_volume,
                    'current_data': row,
                    'historical_data': df.iloc[:i+1] if i > 0 else df.iloc[:1],
                    'index': i
                })
                
                # Execute strategy code
                try:
                    exec(strategy_code, strategy_globals)
                except Exception as strategy_error:
                    print(f"Strategy error at {current_timestamp}: {strategy_error}")
                    continue
                
                # Process signals
                for signal in signals:
                    if signal['timestamp'] == current_timestamp:
                        if signal['action'] == 'buy':
                            quantity = min(signal['quantity'], self.portfolio.current_capital / current_price * 0.95)
                            if quantity > 0:
                                self.portfolio.enter_position(
                                    current_timestamp, 
                                    current_price, 
                                    'buy', 
                                    quantity
                                )
                        
                        elif signal['action'] == 'sell':
                            if self.portfolio.open_positions:
                                self.portfolio.exit_position(current_timestamp, current_price)
                        
                        elif signal['action'] == 'close_all':
                            while self.portfolio.open_positions:
                                self.portfolio.exit_position(current_timestamp, current_price)
                
                # Update portfolio equity
                self.portfolio.update_equity({'close': current_price})
            
            # Close any remaining positions at the end
            if self.portfolio.open_positions:
                final_price = df.iloc[-1]['close']
                final_timestamp = df.iloc[-1]['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                while self.portfolio.open_positions:
                    self.portfolio.exit_position(final_timestamp, final_price)
            
            # Calculate final statistics
            stats = self.portfolio.get_statistics()
            
            # Prepare results
            results = {
                'status': 'success',
                'statistics': stats,
                'trades': [trade.to_dict() for trade in self.portfolio.trades],
                'equity_curve': self.portfolio.equity_curve,
                'drawdown_curve': self.portfolio.drawdown_curve,
                'signals': signals,
                'total_periods': len(df),
                'start_date': df.iloc[0]['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                'end_date': df.iloc[-1]['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
            }
            
            return results
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'message': f'Backtest failed: {str(e)}'
            }

def main():
    """Main function for command-line execution"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No configuration provided'}))
        return
    
    try:
        config = json.loads(sys.argv[1])
        
        # Extract configuration
        strategy_code = config.get('strategyCode', '')
        symbol = config.get('symbol', 'BTCUSDT')
        start_date = config.get('startDate', '2024-01-01')
        end_date = config.get('endDate', '2024-12-31')
        initial_capital = float(config.get('initialCapital', 100000))
        
        # Initialize backtester
        backtester = Backtester(initial_capital)
        
        # Load or generate data
        if 'marketData' in config:
            success = backtester.load_data(config['marketData'])
        else:
            success = backtester.generate_sample_data(start_date, end_date, symbol)
        
        if not success:
            print(json.dumps({'error': 'Failed to load market data'}))
            return
        
        # Run backtest
        results = backtester.run_backtest(strategy_code, config)
        
        # Output results
        print(json.dumps(results, default=str))
        
    except Exception as e:
        print(json.dumps({
            'status': 'error',
            'error': str(e),
            'message': f'Backtester initialization failed: {str(e)}'
        }))

if __name__ == '__main__':
    main()
