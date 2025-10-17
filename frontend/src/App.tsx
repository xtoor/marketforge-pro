/**
 * MarketForge-Pro Main Application
 *
 * Integrates:
 * - TradingView lightweight-charts
 * - Multi-broker data sources
 * - Resonance.ai Scanner alerts
 * - ML strategy predictions
 */

import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradingChart } from './components/TradingChart';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { StrategyEditor } from './components/StrategyEditor';
import { PineScriptEditor } from './components/PineScriptEditor';
import './App.css';

const queryClient = new QueryClient();

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  executed_at: string;
}

function App() {
  const [symbol, setSymbol] = useState('bitcoin');
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [enableML, setEnableML] = useState(false);
  const [showPaperTrading, setShowPaperTrading] = useState(false);
  const [showStrategyEditor, setShowStrategyEditor] = useState(false);
  const [showPineScriptEditor, setShowPineScriptEditor] = useState(false);

  const handleTradeExecuted = useCallback((_trade: Trade) => {
    // Trade markers could be displayed on chart in future
    // For now, just acknowledge the trade was executed
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-container">
        <header className="app-header">
          <h1>MarketForge-Pro</h1>
          <p className="subtitle">
            Advanced Financial Visualization Platform
          </p>
        </header>

        <main className="app-main">
          <div className="controls-panel">
            <div className="symbol-selector">
              <label>Symbol:</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              >
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="binancecoin">Binance Coin (BNB)</option>
                <option value="cardano">Cardano (ADA)</option>
                <option value="solana">Solana (SOL)</option>
              </select>
            </div>

            <div className="feature-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={enableAlerts}
                  onChange={(e) => setEnableAlerts(e.target.checked)}
                />
                Resonance.ai Alerts
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={enableML}
                  onChange={(e) => setEnableML(e.target.checked)}
                />
                ML Predictions
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showPaperTrading}
                  onChange={(e) => setShowPaperTrading(e.target.checked)}
                />
                Paper Trading
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showStrategyEditor}
                  onChange={(e) => setShowStrategyEditor(e.target.checked)}
                />
                Strategy Editor
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showPineScriptEditor}
                  onChange={(e) => setShowPineScriptEditor(e.target.checked)}
                />
                Pine Script Editor
              </label>
            </div>
          </div>

          {showPaperTrading && (
            <div style={{ marginBottom: '20px' }}>
              <PaperTradingPanel
                symbol={`${symbol.toUpperCase()}/USD`}
                onTradeExecuted={handleTradeExecuted}
              />
            </div>
          )}

          {showStrategyEditor && (
            <div style={{ marginBottom: '20px' }}>
              <StrategyEditor symbol={symbol} />
            </div>
          )}

          {showPineScriptEditor && (
            <div style={{ marginBottom: '20px' }}>
              <PineScriptEditor />
            </div>
          )}

          <TradingChart
            symbol={symbol}
            enableAlerts={enableAlerts}
            enableML={enableML}
          />
        </main>

        <footer className="app-footer">
          <p>
            Powered by{' '}
            <a href="https://github.com/tradingview/lightweight-charts" target="_blank" rel="noopener noreferrer">
              TradingView Lightweight Charts
            </a>
          </p>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
