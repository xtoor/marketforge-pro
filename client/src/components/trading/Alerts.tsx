import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import type { Symbol } from "@shared/schema";

const mockUserId = "user-1";

export default function Alerts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [symbolId, setSymbolId] = useState('');
  const [type, setType] = useState<'price' | 'indicator'>('price');
  const [condition, setCondition] = useState('above');
  const [value, setValue] = useState('');
  const [indicator, setIndicator] = useState('');

  const { data: alerts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/alerts', mockUserId],
  });

  const { data: symbols = [] } = useQuery<Symbol[]>({
    queryKey: ['/api/symbols'],
  });

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      if (!response.ok) throw new Error('Failed to create alert');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', mockUserId] });
      setIsAddDialogOpen(false);
      resetForm();
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete alert');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', mockUserId] });
    },
  });

  const resetForm = () => {
    setSymbolId('');
    setType('price');
    setCondition('above');
    setValue('');
    setIndicator('');
  };

  const handleCreateAlert = () => {
    if (!symbolId || !value) return;

    const alertData = {
      userId: mockUserId,
      symbolId,
      type,
      condition,
      value: parseFloat(value), // Convert to number
      ...(type === 'indicator' && { indicator }),
    };

    createAlertMutation.mutate(alertData);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Active Alerts</h3>
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide">Active Alerts</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-add-alert">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={symbolId} onValueChange={setSymbolId}>
                <SelectTrigger data-testid="select-alert-symbol">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((symbol) => (
                    <SelectItem key={symbol.id} value={symbol.id}>
                      {symbol.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={setType as any}>
                <SelectTrigger data-testid="select-alert-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Price Alert</SelectItem>
                  <SelectItem value="indicator">Indicator Alert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger data-testid="select-alert-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above</SelectItem>
                  <SelectItem value="below">Below</SelectItem>
                  <SelectItem value="crosses_above">Crosses Above</SelectItem>
                  <SelectItem value="crosses_below">Crosses Below</SelectItem>
                </SelectContent>
              </Select>

              {type === 'indicator' && (
                <Select value={indicator} onValueChange={setIndicator}>
                  <SelectTrigger data-testid="select-alert-indicator">
                    <SelectValue placeholder="Select indicator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rsi">RSI</SelectItem>
                    <SelectItem value="macd">MACD</SelectItem>
                    <SelectItem value="ma">Moving Average</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Input
                type="number"
                placeholder={type === 'price' ? "Price value" : "Indicator value"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                data-testid="input-alert-value"
              />

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAlert}
                  disabled={!symbolId || !value || createAlertMutation.isPending}
                  data-testid="button-create-alert"
                >
                  {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-2">
        {(alerts as any[]).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          (alerts as any[]).map((alert: any) => (
            <div
              key={alert.id}
              className="bg-card rounded-lg p-3 border border-yellow-500/30"
              data-testid={`alert-${alert.id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm">{alert.symbol.symbol}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlertMutation.mutate(alert.id)}
                  disabled={deleteAlertMutation.isPending}
                  className="text-destructive hover:text-destructive/80"
                  data-testid={`button-delete-alert-${alert.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs">
                <div className="text-muted-foreground capitalize">
                  {alert.type} Alert
                </div>
                <div className="font-mono">
                  {alert.indicator ? `${alert.indicator.toUpperCase()} ` : ''}
                  {alert.condition} {alert.value}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
