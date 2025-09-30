import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Bell,
  LineChart,
  Ruler,
  Settings,
  Trash2
} from "lucide-react";

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ChartContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
  onAddIndicator: () => void;
  onAddAlert: () => void;
  onAddDrawing: (tool: string) => void;
  onChartSettings: () => void;
  onClearDrawings: () => void;
}

export default function ChartContextMenu({
  position,
  onClose,
  onAddIndicator,
  onAddAlert,
  onAddDrawing,
  onChartSettings,
  onClearDrawings,
}: ChartContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (position) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [position]);

  useEffect(() => {
    const handleClick = () => {
      onClose();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  if (!position || !isVisible) return null;

  const menuItems = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Add Indicator",
      onClick: onAddIndicator,
      testId: "context-add-indicator"
    },
    {
      icon: <Bell className="h-4 w-4" />,
      label: "Add Alert",
      onClick: onAddAlert,
      testId: "context-add-alert"
    },
    { separator: true },
    {
      icon: <LineChart className="h-4 w-4" />,
      label: "Trend Line",
      onClick: () => onAddDrawing('trendline'),
      testId: "context-trendline"
    },
    {
      icon: <Ruler className="h-4 w-4" />,
      label: "Horizontal Line",
      onClick: () => onAddDrawing('horizontal'),
      testId: "context-horizontal"
    },
    {
      icon: <Ruler className="h-4 w-4 rotate-45" />,
      label: "Fibonacci Retracement",
      onClick: () => onAddDrawing('fibonacci'),
      testId: "context-fibonacci"
    },
    { separator: true },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Chart Settings",
      onClick: onChartSettings,
      testId: "context-settings"
    },
    { separator: true },
    {
      icon: <Trash2 className="h-4 w-4" />,
      label: "Clear All Drawings",
      onClick: onClearDrawings,
      testId: "context-clear-drawings"
    },
  ];

  return (
    <Card
      className="fixed z-50 w-56 p-1 bg-card/95 backdrop-blur-sm border-border shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid="chart-context-menu"
    >
      {menuItems.map((item, index) => {
        if ('separator' in item) {
          return <Separator key={`sep-${index}`} className="my-1" />;
        }

        return (
          <button
            key={index}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-primary/10 text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
              onClose();
            }}
            data-testid={item.testId}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </Card>
  );
}
