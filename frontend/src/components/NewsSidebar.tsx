/**
 * NewsSidebar Component
 *
 * Displays real-time crypto news and market sentiment
 * Features:
 * - Latest crypto news headlines
 * - Market sentiment indicators
 * - Collapsible sidebar
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  url?: string;
}

interface NewsSidebarProps {
  theme?: 'light' | 'dark';
  onToggle?: (isOpen: boolean) => void;
}

export const NewsSidebar: React.FC<NewsSidebarProps> = ({
  theme = 'dark',
  onToggle
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [marketSentiment, setMarketSentiment] = useState({
    overall: 'neutral' as 'bullish' | 'bearish' | 'neutral',
    fearGreedIndex: 50,
    trend: 'sideways' as 'up' | 'down' | 'sideways'
  });

  const bgColor = theme === 'dark' ? '#1e222d' : '#f5f5f5';
  const borderColor = theme === 'dark' ? '#2b2b43' : '#e1e1e1';
  const textColor = theme === 'dark' ? '#d1d4dc' : '#191919';
  const cardBg = theme === 'dark' ? '#2b2b43' : '#ffffff';
  const hoverBg = theme === 'dark' ? '#363a45' : '#e8e8e8';

  // Fetch real-time crypto news from API
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/news/crypto-news`, {
          params: { limit: 10 }
        });

        const fetchedNews: NewsItem[] = response.data.news.map((item: any) => ({
          id: item.id,
          title: item.title,
          source: item.source,
          timestamp: item.published_at,
          sentiment: item.sentiment as 'bullish' | 'bearish' | 'neutral',
          url: item.url
        }));

        setNewsItems(fetchedNews);

        // Calculate overall sentiment
        const bullishCount = fetchedNews.filter(n => n.sentiment === 'bullish').length;
        const bearishCount = fetchedNews.filter(n => n.sentiment === 'bearish').length;

        let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (bullishCount > bearishCount) overall = 'bullish';
        else if (bearishCount > bullishCount) overall = 'bearish';

        setMarketSentiment({
          overall,
          fearGreedIndex: 65, // Mock value - could be integrated with Fear & Greed API
          trend: bullishCount > bearishCount ? 'up' : bearishCount > bullishCount ? 'down' : 'sideways'
        });
      } catch (error) {
        console.error('Failed to fetch news:', error);
        // Keep empty state on error
        setNewsItems([]);
      }
    };

    fetchNews();

    // Auto-refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggle) onToggle(newState);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getSentimentColor = (sentiment: 'bullish' | 'bearish' | 'neutral') => {
    switch (sentiment) {
      case 'bullish': return '#26a69a';
      case 'bearish': return '#ef5350';
      case 'neutral': return '#888';
    }
  };

  const getSentimentIcon = (sentiment: 'bullish' | 'bearish' | 'neutral') => {
    switch (sentiment) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      case 'neutral': return '➡️';
    }
  };

  if (!isOpen) {
    return (
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000
      }}>
        <button
          onClick={handleToggle}
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            padding: '16px 8px',
            cursor: 'pointer',
            color: textColor,
            fontSize: '14px',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed'
          }}
        >
          📰 News
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '320px',
      background: bgColor,
      borderRight: `1px solid ${borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '2px 0 8px rgba(0,0,0,0.2)'
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
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: textColor
        }}>
          📰 Market News
        </div>
        <button
          onClick={handleToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontSize: '18px',
            padding: '4px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Market Sentiment Summary */}
      <div style={{
        padding: '16px',
        background: cardBg,
        borderBottom: `1px solid ${borderColor}`
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          color: textColor,
          marginBottom: '12px'
        }}>
          Market Sentiment
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            fontSize: '24px'
          }}>
            {getSentimentIcon(marketSentiment.overall)}
          </div>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: getSentimentColor(marketSentiment.overall),
              textTransform: 'capitalize'
            }}>
              {marketSentiment.overall}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#888'
            }}>
              Overall Market
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px',
          background: bgColor,
          borderRadius: '6px'
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              color: '#888',
              marginBottom: '4px'
            }}>
              Fear & Greed
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: marketSentiment.fearGreedIndex > 60 ? '#26a69a' : marketSentiment.fearGreedIndex < 40 ? '#ef5350' : '#888'
            }}>
              {marketSentiment.fearGreedIndex}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: '11px',
              color: '#888',
              marginBottom: '4px'
            }}>
              Trend
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: marketSentiment.trend === 'up' ? '#26a69a' : marketSentiment.trend === 'down' ? '#ef5350' : '#888'
            }}>
              {marketSentiment.trend === 'up' ? '↗' : marketSentiment.trend === 'down' ? '↘' : '→'}
            </div>
          </div>
        </div>
      </div>

      {/* News Feed */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0'
      }}>
        <div style={{
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 'bold',
          color: textColor,
          borderBottom: `1px solid ${borderColor}`
        }}>
          Latest Headlines
        </div>

        {newsItems.map(item => (
          <div
            key={item.id}
            style={{
              padding: '16px',
              borderBottom: `1px solid ${borderColor}`,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => {
              if (item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>
                {getSentimentIcon(item.sentiment)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: textColor,
                  marginBottom: '6px',
                  lineHeight: '1.4'
                }}>
                  {item.title}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#888'
                }}>
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>{formatTimestamp(item.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        background: cardBg,
        borderTop: `1px solid ${borderColor}`,
        fontSize: '11px',
        color: '#888',
        textAlign: 'center'
      }}>
        Updates every 5 minutes
      </div>
    </div>
  );
};
