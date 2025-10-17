/**
 * DrawingToolbar Component
 *
 * Toolbar for chart drawing tools with icon buttons
 */

import React, { useState } from 'react';
import { DrawingType } from '../utils/DrawingManager';

interface DrawingToolbarProps {
  activeDrawing: DrawingType | null;
  onSelectTool: (tool: DrawingType | null) => void;
  onClearAll: () => void;
  onExport: () => void;
  onImport: () => void;
  drawingsCount: number;
  theme?: 'light' | 'dark';
}

interface Tool {
  type: DrawingType;
  icon: string;
  label: string;
  shortcut?: string;
}

const DRAWING_TOOLS: Tool[] = [
  { type: 'horizontal-line', icon: '━', label: 'Horizontal Line', shortcut: 'H' },
  { type: 'vertical-line', icon: '┃', label: 'Vertical Line', shortcut: 'V' },
  { type: 'trendline', icon: '╱', label: 'Trendline', shortcut: 'T' },
  { type: 'fibonacci', icon: 'φ', label: 'Fibonacci', shortcut: 'F' },
  { type: 'rectangle', icon: '▭', label: 'Rectangle', shortcut: 'R' },
  { type: 'arrow-up', icon: '↑', label: 'Arrow Up' },
  { type: 'arrow-down', icon: '↓', label: 'Arrow Down' },
  { type: 'text', icon: 'T', label: 'Text', shortcut: 'A' },
  { type: 'measure', icon: '📏', label: 'Measure', shortcut: 'M' },
];

// Cursor tool is handled separately since it's not a drawing type
const CURSOR_TOOL = { icon: '✋', label: 'Cursor (Pan)', shortcut: 'Esc' };

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  activeDrawing,
  onSelectTool,
  onClearAll,
  onExport,
  onImport,
  drawingsCount,
  theme = 'dark',
}) => {
  const [showMore, setShowMore] = useState(false);

  const bgColor = theme === 'dark' ? '#1e222d' : '#f5f5f5';
  const borderColor = theme === 'dark' ? '#2b2b43' : '#e1e1e1';
  const textColor = theme === 'dark' ? '#d1d4dc' : '#191919';
  const activeColor = theme === 'dark' ? '#3179F5' : '#1976D2';
  const hoverColor = theme === 'dark' ? '#363C4E' : '#d0d0d0';

  const handleToolClick = (tool: DrawingType) => {
    if (activeDrawing === tool) {
      onSelectTool(null); // Deselect
    } else {
      onSelectTool(tool);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        onImport();
        // Parent component will handle actual import logic
        console.log('Import file content:', content);
      } catch (error) {
        console.error('Failed to read import file:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      {/* Main toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: textColor,
            marginRight: '8px',
          }}
        >
          Drawing Tools:
        </span>

        {/* Cursor tool (first button) */}
        <button
          onClick={() => onSelectTool(null)}
          title={`${CURSOR_TOOL.label} (${CURSOR_TOOL.shortcut})`}
          style={{
            padding: '8px 12px',
            background: activeDrawing === null ? activeColor : borderColor,
            border: 'none',
            borderRadius: '4px',
            color: activeDrawing === null ? '#ffffff' : textColor,
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (activeDrawing !== null) {
              e.currentTarget.style.background = hoverColor;
            }
          }}
          onMouseLeave={(e) => {
            if (activeDrawing !== null) {
              e.currentTarget.style.background = borderColor;
            }
          }}
        >
          {CURSOR_TOOL.icon}
        </button>

        {/* Drawing tool buttons */}
        {DRAWING_TOOLS.slice(0, showMore ? undefined : 6).map((tool) => (
          <button
            key={tool.type}
            onClick={() => handleToolClick(tool.type)}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
            style={{
              padding: '8px 12px',
              background: activeDrawing === tool.type ? activeColor : borderColor,
              border: 'none',
              borderRadius: '4px',
              color: activeDrawing === tool.type ? '#ffffff' : textColor,
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              minWidth: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              if (activeDrawing !== tool.type) {
                e.currentTarget.style.background = hoverColor;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                activeDrawing === tool.type ? activeColor : borderColor;
            }}
          >
            {tool.icon}
          </button>
        ))}

        {/* Show more/less toggle */}
        {!showMore && DRAWING_TOOLS.length > 6 && (
          <button
            onClick={() => setShowMore(true)}
            style={{
              padding: '8px 12px',
              background: borderColor,
              border: 'none',
              borderRadius: '4px',
              color: textColor,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.background = borderColor)}
          >
            +{DRAWING_TOOLS.length - 6} More
          </button>
        )}

        {showMore && (
          <button
            onClick={() => setShowMore(false)}
            style={{
              padding: '8px 12px',
              background: borderColor,
              border: 'none',
              borderRadius: '4px',
              color: textColor,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverColor)}
            onMouseLeave={(e) => (e.currentTarget.style.background = borderColor)}
          >
            Show Less
          </button>
        )}

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '30px',
            background: borderColor,
            margin: '0 8px',
          }}
        />

        {/* Action buttons */}
        <button
          onClick={onClearAll}
          disabled={drawingsCount === 0}
          style={{
            padding: '8px 16px',
            background: drawingsCount > 0 ? '#ef5350' : borderColor,
            border: 'none',
            borderRadius: '4px',
            color: drawingsCount > 0 ? '#ffffff' : textColor,
            cursor: drawingsCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: 'bold',
            opacity: drawingsCount > 0 ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (drawingsCount > 0) {
              e.currentTarget.style.background = '#d32f2f';
            }
          }}
          onMouseLeave={(e) => {
            if (drawingsCount > 0) {
              e.currentTarget.style.background = '#ef5350';
            }
          }}
        >
          🗑️ Clear All ({drawingsCount})
        </button>

        <button
          onClick={onExport}
          disabled={drawingsCount === 0}
          style={{
            padding: '8px 16px',
            background: drawingsCount > 0 ? '#4CAF50' : borderColor,
            border: 'none',
            borderRadius: '4px',
            color: drawingsCount > 0 ? '#ffffff' : textColor,
            cursor: drawingsCount > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: 'bold',
            opacity: drawingsCount > 0 ? 1 : 0.5,
          }}
          onMouseEnter={(e) => {
            if (drawingsCount > 0) {
              e.currentTarget.style.background = '#388E3C';
            }
          }}
          onMouseLeave={(e) => {
            if (drawingsCount > 0) {
              e.currentTarget.style.background = '#4CAF50';
            }
          }}
        >
          💾 Export
        </button>

        <label
          style={{
            padding: '8px 16px',
            background: '#2196F3',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1976D2')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2196F3')}
        >
          📂 Import
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Active drawing indicator */}
      {activeDrawing && (
        <div
          style={{
            padding: '8px 12px',
            background: activeColor,
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Drawing Mode: {DRAWING_TOOLS.find((t) => t.type === activeDrawing)?.label}
          </span>
          <button
            onClick={() => onSelectTool(null)}
            style={{
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '3px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')
            }
          >
            ESC to Cancel
          </button>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div
        style={{
          fontSize: '11px',
          color: theme === 'dark' ? '#888' : '#666',
          fontStyle: 'italic',
        }}
      >
        💡 Tip: Use keyboard shortcuts (H, V, T, F, etc.) to quickly select tools
      </div>
    </div>
  );
};
