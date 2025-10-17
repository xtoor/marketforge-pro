/**
 * StrategyEditor Component
 *
 * Code editor for custom trading strategies with backtesting
 * Strategies are written in Python and executed on the backend
 */

import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

interface StrategyEditorProps {
  symbol: string;
  theme?: 'light' | 'dark';
}

interface BacktestResult {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_return: number;
  total_return_percent: number;
  sharpe_ratio: number;
  max_drawdown: number;
  avg_trade_return: number;
  trades: Array<{
    timestamp: number;
    side: string;
    price: number;
    quantity: number;
    pnl: number;
  }>;
}

const DEFAULT_STRATEGY = `# Custom Trading Strategy
# Available indicators: sma, ema, rsi, macd, bollinger_bands
# Available data: close, open, high, low, volume

def strategy(data):
    """
    Define your trading strategy

    Args:
        data: DataFrame with columns [time, open, high, low, close, volume]

    Returns:
        signals: List of {'time': timestamp, 'side': 'buy'|'sell', 'quantity': float}
    """
    signals = []

    # Example: Simple SMA crossover strategy
    data['sma_fast'] = data['close'].rolling(window=20).mean()
    data['sma_slow'] = data['close'].rolling(window=50).mean()

    for i in range(1, len(data)):
        # Buy signal: fast SMA crosses above slow SMA
        if (data['sma_fast'].iloc[i] > data['sma_slow'].iloc[i] and
            data['sma_fast'].iloc[i-1] <= data['sma_slow'].iloc[i-1]):
            signals.append({
                'time': data['time'].iloc[i],
                'side': 'buy',
                'quantity': 1.0
            })

        # Sell signal: fast SMA crosses below slow SMA
        elif (data['sma_fast'].iloc[i] < data['sma_slow'].iloc[i] and
              data['sma_fast'].iloc[i-1] >= data['sma_slow'].iloc[i-1]):
            signals.append({
                'time': data['time'].iloc[i],
                'side': 'sell',
                'quantity': 1.0
            })

    return signals
`;

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
  symbol,
  theme = 'dark'
}) => {
  const [code, setCode] = useState(DEFAULT_STRATEGY);
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [backtesting, setBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bgColor = theme === 'dark' ? '#1e222d' : '#f5f5f5';
  const borderColor = theme === 'dark' ? '#2b2b43' : '#e1e1e1';
  const textColor = theme === 'dark' ? '#d1d4dc' : '#191919';
  const cardBg = theme === 'dark' ? '#2b2b43' : '#ffffff';
  const codeBg = theme === 'dark' ? '#1a1e27' : '#f8f8f8';

  const handleBacktest = async () => {
    setBacktesting(true);
    setError(null);
    setBacktestResult(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/strategy/backtest`,
        {
          strategy_code: code,
          symbol,
          timeframe: '1h',
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
          end_date: new Date().toISOString(),
          initial_balance: 10000
        },
        { timeout: 60000 } // 60 second timeout for backtest
      );

      setBacktestResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Backtest failed');
    } finally {
      setBacktesting(false);
    }
  };

  const handleSaveStrategy = () => {
    // Save strategy to localStorage
    const strategies = JSON.parse(localStorage.getItem('trading-strategies') || '[]');
    strategies.push({
      id: Date.now().toString(),
      name: strategyName,
      code,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('trading-strategies', JSON.stringify(strategies));
    alert(`Strategy "${strategyName}" saved!`);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '6px',
      overflow: 'hidden',
      color: textColor
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ flex: 1, marginRight: '16px' }}>
          <input
            type="text"
            value={strategyName}
            onChange={(e) => setStrategyName(e.target.value)}
            placeholder="Strategy Name"
            style={{
              width: '100%',
              padding: '8px 12px',
              background: codeBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              color: textColor,
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSaveStrategy}
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            💾 Save
          </button>
          <button
            onClick={handleBacktest}
            disabled={backtesting}
            style={{
              padding: '8px 16px',
              background: backtesting ? '#888' : '#2196F3',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              cursor: backtesting ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 'bold'
            }}
          >
            {backtesting ? '⏳ Running...' : '▶️ Backtest'}
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderBottom: `1px solid ${borderColor}`
        }}>
          <div style={{
            padding: '8px 16px',
            background: cardBg,
            borderBottom: `1px solid ${borderColor}`,
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#888'
          }}>
            Strategy Code (Python)
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              padding: '16px',
              background: codeBg,
              border: 'none',
              color: textColor,
              fontSize: '13px',
              fontFamily: 'Monaco, "Courier New", monospace',
              lineHeight: '1.6',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Results Panel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          background: cardBg
        }}>
          <div style={{
            padding: '8px 16px',
            background: cardBg,
            borderBottom: `1px solid ${borderColor}`,
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#888'
          }}>
            Backtest Results
          </div>

          <div style={{ padding: '16px' }}>
            {error && (
              <div style={{
                padding: '12px',
                background: '#ef535020',
                border: '1px solid #ef5350',
                borderRadius: '4px',
                color: '#ef5350',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {backtestResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Performance Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px'
                }}>
                  <div style={{
                    padding: '12px',
                    background: bgColor,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Total Return
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: backtestResult.total_return >= 0 ? '#26a69a' : '#ef5350'
                    }}>
                      {formatCurrency(backtestResult.total_return)}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: backtestResult.total_return_percent >= 0 ? '#26a69a' : '#ef5350'
                    }}>
                      {formatPercent(backtestResult.total_return_percent)}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    background: bgColor,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Win Rate
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {backtestResult.win_rate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {backtestResult.winning_trades}W / {backtestResult.losing_trades}L
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    background: bgColor,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Sharpe Ratio
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {backtestResult.sharpe_ratio.toFixed(2)}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    background: bgColor,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Max Drawdown
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef5350' }}>
                      {formatPercent(backtestResult.max_drawdown)}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    background: bgColor,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Total Trades
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {backtestResult.total_trades}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    background: bgColor,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                      Avg Trade Return
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: backtestResult.avg_trade_return >= 0 ? '#26a69a' : '#ef5350'
                    }}>
                      {formatCurrency(backtestResult.avg_trade_return)}
                    </div>
                  </div>
                </div>

                {/* Trade History */}
                {backtestResult.trades.length > 0 && (
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '8px',
                      color: textColor
                    }}>
                      Trade History (Last 10)
                    </div>
                    <table style={{
                      width: '100%',
                      fontSize: '12px',
                      borderCollapse: 'collapse'
                    }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Side</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResult.trades.slice(-10).reverse().map((trade, idx) => (
                          <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}` }}>
                            <td style={{ padding: '8px' }}>
                              {new Date(trade.timestamp * 1000).toLocaleDateString()}
                            </td>
                            <td style={{
                              padding: '8px',
                              color: trade.side === 'buy' ? '#26a69a' : '#ef5350',
                              textTransform: 'uppercase'
                            }}>
                              {trade.side}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {formatCurrency(trade.price)}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>
                              {trade.quantity}
                            </td>
                            <td style={{
                              padding: '8px',
                              textAlign: 'right',
                              color: trade.pnl >= 0 ? '#26a69a' : '#ef5350',
                              fontWeight: 'bold'
                            }}>
                              {formatCurrency(trade.pnl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!backtestResult && !error && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#888',
                fontSize: '13px'
              }}>
                Click &quot;Backtest&quot; to test your strategy against historical data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div style={{
        padding: '12px 16px',
        background: bgColor,
        borderTop: `1px solid ${borderColor}`,
        fontSize: '11px',
        color: '#888',
        lineHeight: '1.6'
      }}>
        <strong>💡 Tips:</strong> Use pandas DataFrame methods for indicators. Available: close, open, high, low, volume columns. Return signals as list of dicts with time, side (&apos;buy&apos;/&apos;sell&apos;), and quantity.
      </div>
    </div>
  );
};
