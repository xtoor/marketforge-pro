import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Settings2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface IndicatorConfig {
  id: string;
  type: string;
  params: Record<string, string | number>;
  enabled: boolean;
  color?: string;
}

interface IndicatorPanelProps {
  indicators: IndicatorConfig[];
  onAddIndicator: (indicator: IndicatorConfig) => void;
  onRemoveIndicator: (id: string) => void;
  onUpdateIndicator: (id: string, updates: Partial<IndicatorConfig>) => void;
}

const INDICATOR_TYPES = [
  { value: 'sma', label: 'Simple Moving Average (SMA)', defaultParams: { period: 20 } },
  { value: 'ema', label: 'Exponential Moving Average (EMA)', defaultParams: { period: 20 } },
  { value: 'rsi', label: 'Relative Strength Index (RSI)', defaultParams: { period: 14 } },
  { value: 'macd', label: 'MACD', defaultParams: { fast: 12, slow: 26, signal: 9 } },
  { value: 'bollinger', label: 'Bollinger Bands', defaultParams: { period: 20, stdDev: 2 } },
  { value: 'stochastic', label: 'Stochastic Oscillator', defaultParams: { kPeriod: 14, dPeriod: 3 } },
  { value: 'atr', label: 'Average True Range (ATR)', defaultParams: { period: 14 } },
  { value: 'adx', label: 'Average Directional Index (ADX)', defaultParams: { period: 14 } },
  { value: 'cci', label: 'Commodity Channel Index (CCI)', defaultParams: { period: 20 } },
  { value: 'williams_r', label: 'Williams %R', defaultParams: { period: 14 } },
  { value: 'obv', label: 'On Balance Volume (OBV)', defaultParams: {} },
];

const INDICATOR_COLORS = [
  '#06B6D4', // cyan
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
];

export default function IndicatorPanel({ indicators, onAddIndicator, onRemoveIndicator, onUpdateIndicator }: IndicatorPanelProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [isOpen, setIsOpen] = useState(true);

  const handleAddIndicator = () => {
    if (!selectedType) return;

    const indicatorDef = INDICATOR_TYPES.find(t => t.value === selectedType);
    if (!indicatorDef) return;

    const newIndicator: IndicatorConfig = {
      id: `${selectedType}-${Date.now()}`,
      type: selectedType,
      params: { ...indicatorDef.defaultParams },
      enabled: true,
      color: INDICATOR_COLORS[indicators.length % INDICATOR_COLORS.length],
    };

    onAddIndicator(newIndicator);
    setSelectedType('');
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="toggle-indicators">
              <Settings2 className="h-4 w-4" />
              <h3 className="font-semibold">TECHNICAL INDICATORS</h3>
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="collapse-indicators"
          >
            {isOpen ? '−' : '+'}
          </Button>
        </div>

        <CollapsibleContent className="space-y-3">
          {/* Add Indicator */}
          <div className="flex gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="flex-1" data-testid="select-indicator-type">
                <SelectValue placeholder="Select indicator..." />
              </SelectTrigger>
              <SelectContent>
                {INDICATOR_TYPES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddIndicator}
              disabled={!selectedType}
              size="sm"
              data-testid="button-add-indicator"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Active Indicators */}
          <div className="space-y-2">
            {indicators.map((indicator) => {
              const indicatorDef = INDICATOR_TYPES.find(t => t.value === indicator.type);
              return (
                <Card key={indicator.id} className="p-3 bg-background/50" data-testid={`indicator-${indicator.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: indicator.color }}
                      />
                      <span className="text-sm font-medium">{indicatorDef?.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoveIndicator(indicator.id)}
                      data-testid={`remove-indicator-${indicator.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Parameters */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(indicator.params).map(([key, value]) => (
                      <div key={key}>
                        <Label className="text-xs text-muted-foreground capitalize">
                          {key}
                        </Label>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => {
                            const newParams = { ...indicator.params, [key]: parseFloat(e.target.value) || 0 };
                            onUpdateIndicator(indicator.id, { params: newParams });
                          }}
                          className="h-7 text-xs"
                          data-testid={`input-${indicator.id}-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          {indicators.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No indicators added. Select one above to get started.
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
