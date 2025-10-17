/**
 * ChartControls Component
 *
 * Control panel for chart configuration:
 * - Timeframe selection
 * - Data source switching (broker vs fallback)
 * - Feature toggles (alerts, ML)
 * - Strategy selection
 */

import React, { useState, useEffect } from 'react';

interface Strategy {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface ChartControlsProps {
  symbol: string;
  timeframe: string;
  source: string;
  onTimeframeChange: (timeframe: string) => void;
  onSourceChange: (source: string) => void;
  enableAlerts: boolean;
  enableML: boolean;
  onStrategySelect?: (strategy: Strategy | null) => void;
  activeStrategyId?: string | null;
}

const TIMEFRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
];

const DATA_SOURCES = [
  { value: 'coingecko', label: 'CoinGecko' },
  { value: 'kraken', label: 'Kraken' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'binance', label: 'Binance' },
  { value: 'gemini', label: 'Gemini' },
];

export const ChartControls: React.FC<ChartControlsProps> = ({
  symbol,
  timeframe,
  source,
  onTimeframeChange,
  onSourceChange,
  enableAlerts,
  enableML,
  onStrategySelect,
  activeStrategyId,
}) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Load strategies from localStorage
  useEffect(() => {
    const loadStrategies = () => {
      try {
        const savedStrategies = JSON.parse(localStorage.getItem('trading-strategies') || '[]');
        setStrategies(savedStrategies);
      } catch (err) {
        console.error('Failed to load strategies:', err);
        setStrategies([]);
      }
    };

    loadStrategies();

    // Listen for storage changes to update when strategies are saved
    const handleStorageChange = () => loadStrategies();
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event when strategies change in same window
    window.addEventListener('strategies-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('strategies-changed', handleStorageChange);
    };
  }, []);

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const strategyId = e.target.value;
    if (!onStrategySelect) return;

    if (strategyId === '') {
      onStrategySelect(null);
    } else {
      const strategy = strategies.find(s => s.id === strategyId);
      if (strategy) {
        onStrategySelect(strategy);
      }
    }
  };

  return (
    <div className="chart-controls">
      <div className="control-group">
        <label className="symbol-label">{symbol}</label>
      </div>

      <div className="control-group">
        <label>Timeframe:</label>
        <div className="button-group">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              className={`timeframe-btn ${timeframe === tf.value ? 'active' : ''}`}
              onClick={() => onTimeframeChange(tf.value)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label>Source:</label>
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="source-select"
        >
          {DATA_SOURCES.map(src => (
            <option key={src.value} value={src.value}>
              {src.label}
            </option>
          ))}
        </select>
      </div>

      {/* Strategy Selector */}
      {onStrategySelect && (
        <div className="control-group">
          <label>Strategy:</label>
          <select
            value={activeStrategyId || ''}
            onChange={handleStrategyChange}
            className="strategy-select"
          >
            <option value="">No Strategy</option>
            {strategies.map(strategy => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="control-group indicators">
        {enableAlerts && (
          <span className="indicator-badge alerts">
            📍 Resonance Alerts
          </span>
        )}
        {enableML && (
          <span className="indicator-badge ml">
            🤖 ML Predictions
          </span>
        )}
        {activeStrategyId && (
          <span className="indicator-badge strategy">
            ⚡ Strategy Active
          </span>
        )}
      </div>
    </div>
  );
};
