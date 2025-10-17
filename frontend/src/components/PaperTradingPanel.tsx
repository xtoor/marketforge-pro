/**
 * PaperTradingPanel Component
 *
 * Virtual trading interface with:
 * - Order entry (market/limit orders)
 * - Portfolio overview
 * - Position management
 * - Trade history
 * - Performance metrics
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

interface Portfolio {
  id: string;
  name: string;
  current_balance: number;
  initial_balance: number;
  stats: {
    total_value: number;
    cash_balance: number;
    positions_value: number;
    total_pnl: number;
    total_pnl_percent: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
  };
}

interface Position {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  average_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
}

interface Order {
  id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  price?: number;
  status: string;
  created_at: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  fee: number;
  total: number;
  executed_at: string;
}

interface PaperTradingPanelProps {
  symbol: string;
  currentPrice?: number;
  theme?: 'light' | 'dark';
  onTradeExecuted?: (trade: Trade) => void;
}

export const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  symbol,
  currentPrice = 0,
  theme = 'dark',
  onTradeExecuted
}) => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'order' | 'positions' | 'orders' | 'trades'>('order');

  // Order form state
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Colors
  const bgColor = theme === 'dark' ? '#1e222d' : '#f5f5f5';
  const borderColor = theme === 'dark' ? '#2b2b43' : '#e1e1e1';
  const textColor = theme === 'dark' ? '#d1d4dc' : '#191919';
  const cardBg = theme === 'dark' ? '#2b2b43' : '#ffffff';

  // Initialize portfolio
  useEffect(() => {
    initializePortfolio();
  }, []);

  // Refresh data periodically
  useEffect(() => {
    if (portfolio) {
      const interval = setInterval(() => {
        refreshData();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [portfolio]);

  const initializePortfolio = async () => {
    try {
      // Check if user has existing portfolios
      const portfoliosRes = await axios.get(`${API_BASE_URL}/api/paper-trading/portfolios`);

      if (portfoliosRes.data.length > 0) {
        // Load first portfolio
        const portfolioId = portfoliosRes.data[0].id;
        await loadPortfolio(portfolioId);
      } else {
        // Create default portfolio
        const createRes = await axios.post(`${API_BASE_URL}/api/paper-trading/portfolios`, {
          name: 'My Portfolio',
          initial_balance: 100000,
          description: 'Default paper trading portfolio'
        });

        await loadPortfolio(createRes.data.id);
      }
    } catch (error) {
      console.error('Failed to initialize portfolio:', error);
      setLoading(false);
    }
  };

  const loadPortfolio = async (portfolioId: string) => {
    try {
      const [portfolioRes, positionsRes, ordersRes, tradesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolioId}`),
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolioId}/positions`),
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolioId}/orders`),
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolioId}/trades?limit=50`)
      ]);

      setPortfolio(portfolioRes.data);
      setPositions(positionsRes.data);
      setOrders(ordersRes.data);
      setTrades(tradesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!portfolio) return;

    try {
      const [portfolioRes, positionsRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolio.id}`),
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolio.id}/positions`),
        axios.get(`${API_BASE_URL}/api/paper-trading/portfolios/${portfolio.id}/orders?status=pending`)
      ]);

      setPortfolio(portfolioRes.data);
      setPositions(positionsRes.data);
      setOrders(prev => [...ordersRes.data, ...prev.filter(o => o.status !== 'pending')]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portfolio || !quantity) return;

    setSubmitting(true);

    try {
      const orderData = {
        symbol,
        side: orderSide,
        order_type: orderType,
        quantity: parseFloat(quantity),
        ...(orderType === 'limit' && limitPrice ? { price: parseFloat(limitPrice) } : {})
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/paper-trading/portfolios/${portfolio.id}/orders`,
        orderData
      );

      // Refresh portfolio and positions
      await refreshData();

      // Check if order was filled
      if (response.data.status === 'filled' && onTradeExecuted) {
        // Fetch the trade details
        const tradesRes = await axios.get(
          `${API_BASE_URL}/api/paper-trading/portfolios/${portfolio.id}/trades?limit=1`
        );

        if (tradesRes.data.length > 0) {
          onTradeExecuted(tradesRes.data[0]);
          setTrades(prev => [tradesRes.data[0], ...prev]);
        }
      }

      // Reset form
      setQuantity('');
      setLimitPrice('');

      // Show success message (in production, use a toast notification)
      alert(`Order ${response.data.status}: ${orderSide.toUpperCase()} ${quantity} ${symbol}`);
    } catch (error: any) {
      console.error('Failed to submit order:', error);
      alert(`Order failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/paper-trading/orders/${orderId}`);
      await refreshData();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', background: bgColor, color: textColor }}>
        Loading paper trading...
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div style={{ padding: '20px', background: bgColor, color: textColor }}>
        Failed to load portfolio
      </div>
    );
  }

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '6px',
      overflow: 'hidden',
      color: textColor
    }}>
      {/* Portfolio Summary Header */}
      <div style={{
        padding: '16px',
        background: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Total Value</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {formatCurrency(portfolio.stats.total_value)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Cash</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {formatCurrency(portfolio.stats.cash_balance)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Total P&L</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: portfolio.stats.total_pnl >= 0 ? '#26a69a' : '#ef5350'
          }}>
            {formatCurrency(portfolio.stats.total_pnl)} ({formatPercent(portfolio.stats.total_pnl_percent)})
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Win Rate</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {portfolio.stats.win_rate.toFixed(1)}% ({portfolio.stats.winning_trades}W / {portfolio.stats.losing_trades}L)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${borderColor}`,
        background: cardBg
      }}>
        {(['order', 'positions', 'orders', 'trades'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === tab ? bgColor : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid #3179F5` : 'none',
              color: activeTab === tab ? textColor : '#888',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
        {/* Order Entry Tab */}
        {activeTab === 'order' && (
          <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                Side
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setOrderSide('buy')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: orderSide === 'buy' ? '#26a69a' : borderColor,
                    border: 'none',
                    borderRadius: '4px',
                    color: orderSide === 'buy' ? '#ffffff' : textColor,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide('sell')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: orderSide === 'sell' ? '#ef5350' : borderColor,
                    border: 'none',
                    borderRadius: '4px',
                    color: orderSide === 'sell' ? '#ffffff' : textColor,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  SELL
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  color: textColor,
                  fontSize: '14px'
                }}
              >
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                Quantity
              </label>
              <input
                type="number"
                step="0.00000001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.0"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  color: textColor,
                  fontSize: '14px'
                }}
              />
            </div>

            {orderType === 'limit' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 'bold' }}>
                  Limit Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={currentPrice.toFixed(2)}
                  required={orderType === 'limit'}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    color: textColor,
                    fontSize: '14px'
                  }}
                />
              </div>
            )}

            <div style={{
              padding: '12px',
              background: theme === 'dark' ? '#363C4E' : '#e1e1e1',
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Current Price:</span>
                <span style={{ fontWeight: 'bold' }}>{formatCurrency(currentPrice)}</span>
              </div>
              {quantity && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Est. Total:</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatCurrency(parseFloat(quantity) * (orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : currentPrice))}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !quantity}
              style={{
                padding: '14px',
                background: orderSide === 'buy' ? '#26a69a' : '#ef5350',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                cursor: submitting || !quantity ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                opacity: submitting || !quantity ? 0.6 : 1
              }}
            >
              {submitting ? 'Submitting...' : `${orderSide.toUpperCase()} ${symbol}`}
            </button>
          </form>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div>
            {positions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No open positions
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Avg Entry</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Current</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => (
                    <tr key={pos.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '8px' }}>{pos.symbol}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{pos.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(pos.average_entry_price)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(pos.current_price)}</td>
                      <td style={{
                        padding: '8px',
                        textAlign: 'right',
                        color: pos.unrealized_pnl >= 0 ? '#26a69a' : '#ef5350',
                        fontWeight: 'bold'
                      }}>
                        {formatCurrency(pos.unrealized_pnl)} ({formatPercent(pos.unrealized_pnl_percent)})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No orders
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Side</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '8px' }}>{order.symbol}</td>
                      <td style={{
                        padding: '8px',
                        color: order.side === 'buy' ? '#26a69a' : '#ef5350',
                        textTransform: 'uppercase'
                      }}>
                        {order.side}
                      </td>
                      <td style={{ padding: '8px', textTransform: 'capitalize' }}>{order.order_type}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{order.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {order.price ? formatCurrency(order.price) : 'Market'}
                      </td>
                      <td style={{ padding: '8px', textTransform: 'capitalize' }}>{order.status}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {order.status === 'pending' && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#ef5350',
                              border: 'none',
                              borderRadius: '3px',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div>
            {trades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                No trade history
              </div>
            ) : (
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Symbol</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Side</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 20).map(trade => (
                    <tr key={trade.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '8px' }}>
                        {new Date(trade.executed_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '8px' }}>{trade.symbol}</td>
                      <td style={{
                        padding: '8px',
                        color: trade.side === 'buy' ? '#26a69a' : '#ef5350',
                        textTransform: 'uppercase'
                      }}>
                        {trade.side}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{trade.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(trade.price)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(trade.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
