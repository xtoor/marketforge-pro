import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIndicatorStore, type IndicatorType } from "@/stores/indicatorStore";
import { TrendingUp } from "lucide-react";

interface AddIndicatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const indicatorDefinitions = [
  { type: 'sma' as IndicatorType, name: 'Simple Moving Average (SMA)', panel: 'main' as const, defaultParams: { period: 20 }, color: '#06B6D4' },
  { type: 'ema' as IndicatorType, name: 'Exponential Moving Average (EMA)', panel: 'main' as const, defaultParams: { period: 20 }, color: '#8B5CF6' },
  { type: 'rsi' as IndicatorType, name: 'Relative Strength Index (RSI)', panel: 'lower' as const, defaultParams: { period: 14 }, color: '#F59E0B' },
  { type: 'macd' as IndicatorType, name: 'MACD', panel: 'lower' as const, defaultParams: { fast: 12, slow: 26, signal: 9 }, color: '#10B981' },
  { type: 'bollinger_bands' as IndicatorType, name: 'Bollinger Bands', panel: 'main' as const, defaultParams: { period: 20, stdDev: 2 }, color: '#EC4899' },
  { type: 'stochastic' as IndicatorType, name: 'Stochastic Oscillator', panel: 'lower' as const, defaultParams: { period: 14, kPeriod: 3, dPeriod: 3 }, color: '#6366F1' },
  { type: 'atr' as IndicatorType, name: 'Average True Range (ATR)', panel: 'lower' as const, defaultParams: { period: 14 }, color: '#EF4444' },
  { type: 'adx' as IndicatorType, name: 'Average Directional Index (ADX)', panel: 'lower' as const, defaultParams: { period: 14 }, color: '#14B8A6' },
];

export default function AddIndicatorDialog({ open, onOpenChange }: AddIndicatorDialogProps) {
  const [selectedType, setSelectedType] = useState<IndicatorType | ''>('');
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const { addIndicator } = useIndicatorStore();

  const selectedIndicator = indicatorDefinitions.find(ind => ind.type === selectedType);

  const handleAdd = () => {
    if (!selectedIndicator) return;

    const params = Object.keys(selectedIndicator.defaultParams).reduce((acc, key) => {
      acc[key] = parameters[key] ?? (selectedIndicator.defaultParams as any)[key];
      return acc;
    }, {} as Record<string, number>);

    addIndicator({
      type: selectedIndicator.type,
      name: selectedIndicator.name,
      parameters: params,
      color: selectedIndicator.color,
      panel: selectedIndicator.panel,
      visible: true
    });

    // Reset and close
    setSelectedType('');
    setParameters({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-add-indicator">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Add Technical Indicator</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Indicator Type Selection */}
          <div className="space-y-2">
            <Label>Indicator Type</Label>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as IndicatorType)}>
              <SelectTrigger data-testid="select-indicator-type">
                <SelectValue placeholder="Select an indicator" />
              </SelectTrigger>
              <SelectContent>
                {indicatorDefinitions.map((ind) => (
                  <SelectItem key={ind.type} value={ind.type}>
                    {ind.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parameters */}
          {selectedIndicator && (
            <div className="space-y-3">
              <Label>Parameters</Label>
              {Object.keys(selectedIndicator.defaultParams).map((param) => (
                <div key={param} className="flex items-center space-x-2">
                  <Label className="w-24 capitalize">{param}:</Label>
                  <Input
                    type="number"
                    value={parameters[param] ?? (selectedIndicator.defaultParams as any)[param]}
                    onChange={(e) => setParameters({ ...parameters, [param]: parseInt(e.target.value) })}
                    className="flex-1"
                    data-testid={`input-param-${param}`}
                  />
                </div>
              ))}
              
              {/* Color Preview */}
              <div className="flex items-center space-x-2">
                <Label className="w-24">Color:</Label>
                <div 
                  className="w-10 h-10 rounded border border-border"
                  style={{ backgroundColor: selectedIndicator.color }}
                />
                <span className="text-sm text-muted-foreground">{selectedIndicator.color}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-indicator"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={!selectedType}
              data-testid="button-add-indicator"
            >
              Add Indicator
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
