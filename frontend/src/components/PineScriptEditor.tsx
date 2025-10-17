import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PineScriptChartOverlay } from './PineScriptChartOverlay';

interface Example {
  name: string;
  type: string;
  code: string;
}

interface TranslationResult {
  success: boolean;
  python_code?: string;
  error?: string;
}

interface ExecutionResult {
  success: boolean;
  orders?: any[];
  positions?: any[];
  indicators?: Record<string, number[]>;
  error?: string;
}

export const PineScriptEditor: React.FC = () => {
  const [pineCode, setPineCode] = useState<string>('');
  const [pythonCode, setPythonCode] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [examples, setExamples] = useState<Example[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';
  const API_BASE = `${API_BASE_URL}/api/pinescript`;

  // Load examples on mount
  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      const response = await axios.get(`${API_BASE}/examples`);
      setExamples(response.data.examples);
    } catch (err) {
      console.error('Failed to load examples:', err);
    }
  };

  const handleTranslate = async () => {
    if (!pineCode.trim()) {
      setError('Please enter Pine Script code');
      return;
    }

    setLoading(true);
    setError('');
    setPythonCode('');

    try {
      const response = await axios.post<TranslationResult>(`${API_BASE}/translate`, {
        code: pineCode
      });

      if (response.data.success) {
        setPythonCode(response.data.python_code || '');
      } else {
        setError(response.data.error || 'Translation failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!pineCode.trim()) {
      setError('Please enter Pine Script code');
      return;
    }

    setLoading(true);
    setError('');
    setExecutionResult(null);

    try {
      const response = await axios.post<ExecutionResult>(`${API_BASE}/execute`, {
        code: pineCode,
        symbol: selectedSymbol,
        timeframe: selectedTimeframe,
        limit: 500
      });

      if (response.data.success) {
        setExecutionResult(response.data);

        // Fetch chart data for visualization
        const chartResponse = await axios.get(`${API_BASE_URL}/api/chart/data/${selectedSymbol}`, {
          params: {
            timeframe: selectedTimeframe,
            source: 'coingecko',
            include_alerts: false,
            include_ml: false
          }
        });

        if (chartResponse.data?.candles) {
          setChartData(chartResponse.data.candles);
        }
      } else {
        setError(response.data.error || 'Execution failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (example: Example) => {
    setPineCode(example.code);
    setPythonCode('');
    setExecutionResult(null);
    setError('');
  };

  return (
    <div className="pine-script-editor" style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h2>Pine Script Editor</h2>

      {/* Examples Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Load Example:
        </label>
        <select
          onChange={(e) => {
            const example = examples.find(ex => ex.name === e.target.value);
            if (example) loadExample(example);
          }}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', width: '300px' }}
        >
          <option value="">Select an example...</option>
          {examples.map((ex) => (
            <option key={ex.name} value={ex.name}>
              {ex.name} ({ex.type})
            </option>
          ))}
        </select>
      </div>

      {/* Configuration */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Symbol:
          </label>
          <input
            type="text"
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            placeholder="BTC/USD"
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
            Timeframe:
          </label>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="1m">1 minute</option>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="1h">1 hour</option>
            <option value="4h">4 hours</option>
            <option value="1d">1 day</option>
          </select>
        </div>
      </div>

      {/* Pine Script Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Pine Script Code:
        </label>
        <textarea
          value={pineCode}
          onChange={(e) => setPineCode(e.target.value)}
          placeholder="Enter Pine Script v5/v6 code here..."
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleTranslate}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? 'Translating...' : 'Translate to Python'}
        </button>
        <button
          onClick={handleExecute}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          {loading ? 'Executing...' : 'Execute Strategy'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Python Code Output */}
      {pythonCode && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Translated Python Code:</h3>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #ddd'
          }}>
            {pythonCode}
          </pre>
        </div>
      )}

      {/* Execution Results */}
      {executionResult && (
        <div>
          <h3>Execution Results:</h3>

          {/* Chart Visualization */}
          {chartData.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <PineScriptChartOverlay
                chartData={chartData}
                executionResult={executionResult}
                width={1000}
                height={500}
              />
            </div>
          )}

          {/* Orders */}
          {executionResult.orders && executionResult.orders.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Orders ({executionResult.orders.length}):</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  backgroundColor: 'white',
                  border: '1px solid #ddd'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Time</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Direction</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Price</th>
                      <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ddd' }}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executionResult.orders.map((order: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{order.time || idx}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{order.type}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{order.direction}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{order.price?.toFixed(2)}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{order.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Positions */}
          {executionResult.positions && executionResult.positions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Current Positions:</h4>
              <pre style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {JSON.stringify(executionResult.positions, null, 2)}
              </pre>
            </div>
          )}

          {/* Indicators */}
          {executionResult.indicators && Object.keys(executionResult.indicators).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4>Indicators:</h4>
              <ul>
                {Object.entries(executionResult.indicators).map(([key, values]: [string, any]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {Array.isArray(values) ? `${values.length} values` : 'N/A'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw JSON */}
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
              View Raw JSON
            </summary>
            <pre style={{
              backgroundColor: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
