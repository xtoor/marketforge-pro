/**
 * StrategySelector Component
 *
 * Manages saved trading strategies: select, activate, delete
 * Executes selected strategy and displays signals on chart
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

interface Strategy {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

interface StrategySelectorProps {
  symbol: string;
  timeframe: string;
  onStrategySignals: (signals: any[]) => void;
  onStrategyChange: (strategy: Strategy | null) => void;
  theme?: 'light' | 'dark';
}

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  symbol,
  timeframe,
  onStrategySignals,
  onStrategyChange,
  theme = 'dark'
}) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgColor = theme === 'dark' ? '#1e222d' : '#f5f5f5';
  const borderColor = theme === 'dark' ? '#2b2b43' : '#e1e1e1';
  const textColor = theme === 'dark' ? '#d1d4dc' : '#191919';
  const cardBg = theme === 'dark' ? '#2b2b43' : '#ffffff';
  const hoverBg = theme === 'dark' ? '#363a45' : '#e8e8e8';

  // Load strategies from localStorage
  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = () => {
    try {
      const savedStrategies = JSON.parse(localStorage.getItem('trading-strategies') || '[]');
      setStrategies(savedStrategies);
    } catch (err) {
      console.error('Failed to load strategies:', err);
      setStrategies([]);
    }
  };

  const handleActivateStrategy = async (strategy: Strategy) => {
    if (activeStrategy?.id === strategy.id) {
      // Deactivate
      setActiveStrategy(null);
      onStrategyChange(null);
      onStrategySignals([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/strategy/execute`,
        {
          strategy_code: strategy.code,
          symbol,
          timeframe
        },
        { timeout: 30000 }
      );

      setActiveStrategy(strategy);
      onStrategyChange(strategy);
      onStrategySignals(response.data.signals || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Execution failed');
      setActiveStrategy(null);
      onStrategyChange(null);
      onStrategySignals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) {
      return;
    }

    const updatedStrategies = strategies.filter(s => s.id !== strategyId);
    localStorage.setItem('trading-strategies', JSON.stringify(updatedStrategies));
    setStrategies(updatedStrategies);

    // If deleted strategy was active, deactivate it
    if (activeStrategy?.id === strategyId) {
      setActiveStrategy(null);
      onStrategyChange(null);
      onStrategySignals([]);
    }
  };

  // Re-execute active strategy when symbol or timeframe changes
  useEffect(() => {
    if (activeStrategy) {
      handleActivateStrategy(activeStrategy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  if (strategies.length === 0) {
    return (
      <div style={{
        padding: '12px',
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        fontSize: '13px',
        color: '#888',
        textAlign: 'center'
      }}>
        No saved strategies. Create one in the Strategy Editor.
      </div>
    );
  }

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: cardBg,
        borderBottom: `1px solid ${borderColor}`,
        fontSize: '13px',
        fontWeight: 'bold',
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>📊 My Strategies</span>
        <button
          onClick={loadStrategies}
          style={{
            padding: '4px 8px',
            background: 'transparent',
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            color: textColor,
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#ef535020',
          borderBottom: `1px solid #ef5350`,
          color: '#ef5350',
          fontSize: '12px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Strategy list */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {strategies.map(strategy => {
          const isActive = activeStrategy?.id === strategy.id;

          return (
            <div
              key={strategy.id}
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${borderColor}`,
                background: isActive ? hoverBg : 'transparent',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                onClick={() => handleActivateStrategy(strategy)}
                style={{ flex: 1 }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: textColor,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {isActive && <span style={{ color: '#4CAF50' }}>●</span>}
                  {strategy.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#888'
                }}>
                  Created: {new Date(strategy.created_at).toLocaleDateString()}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStrategy(strategy.id);
                }}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  background: '#ef535020',
                  border: '1px solid #ef5350',
                  borderRadius: '4px',
                  color: '#ef5350',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                🗑️ Delete
              </button>
            </div>
          );
        })}
      </div>

      {/* Active strategy indicator */}
      {activeStrategy && (
        <div style={{
          padding: '12px 16px',
          background: '#4CAF5020',
          borderTop: `1px solid #4CAF50`,
          fontSize: '12px',
          color: '#4CAF50',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>✓</span>
          <span>
            <strong>{activeStrategy.name}</strong> is active
          </span>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div style={{
          padding: '12px 16px',
          background: cardBg,
          borderTop: `1px solid ${borderColor}`,
          fontSize: '12px',
          color: '#888',
          textAlign: 'center'
        }}>
          ⏳ Executing strategy...
        </div>
      )}
    </div>
  );
};
