import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingStore } from "@/stores/tradingStore";
import { Plus, X } from "lucide-react";
import type { Symbol } from "@shared/schema";

const mockUserId = "user-1"; // In real app, get from auth context

export default function Watchlist() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>("");
  const { setCurrentSymbol } = useTradingStore();

  const { data: watchlist = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/watchlist', mockUserId],
  });

  const { data: symbols = [] } = useQuery<Symbol[]>({
    queryKey: ['/api/symbols'],
  });

  const addMutation = useMutation({
    mutationFn: async (symbolId: string) => {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: mockUserId, symbolId }),
      });
      if (!response.ok) throw new Error('Failed to add to watchlist');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist', mockUserId] });
      setIsAddDialogOpen(false);
      setSelectedSymbolId("");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (symbolId: string) => {
      const response = await fetch(`/api/watchlist/${mockUserId}/${symbolId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove from watchlist');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist', mockUserId] });
    },
  });

  const handleSymbolClick = (item: any) => {
    setCurrentSymbol(item.symbol);
  };

  const handleAddToWatchlist = () => {
    if (selectedSymbolId) {
      addMutation.mutate(selectedSymbolId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 border-b border-border">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/2 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide">Watchlist</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-add-watchlist">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Symbol to Watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={selectedSymbolId} onValueChange={setSelectedSymbolId}>
                <SelectTrigger data-testid="select-symbol">
                  <SelectValue placeholder="Select a symbol" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((symbol) => (
                    <SelectItem key={symbol.id} value={symbol.id}>
                      {symbol.symbol} - {symbol.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel-add">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddToWatchlist} 
                  disabled={!selectedSymbolId || addMutation.isPending}
                  data-testid="button-confirm-add"
                >
                  {addMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="space-y-1">
        {(watchlist as any[]).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No symbols in watchlist</p>
            <p className="text-xs">Click + to add symbols</p>
          </div>
        ) : (
          (watchlist as any[]).map((item: any) => (
            <div
              key={item.id}
              className="trading-panel bg-card rounded-lg p-3 cursor-pointer border border-transparent hover:border-primary/30 group"
              onClick={() => handleSymbolClick(item)}
              data-testid={`watchlist-item-${item.symbol.symbol}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-mono font-semibold text-sm">{item.symbol.symbol}</div>
                  <div className="text-muted-foreground text-xs">{item.symbol.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-secondary">$43,250.78</div>
                  <div className="font-mono text-xs text-secondary">+2.34%</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(item.symbol.id);
                  }}
                  disabled={removeMutation.isPending}
                  data-testid={`button-remove-${item.symbol.symbol}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
