import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTradingStore } from "@/stores/tradingStore";
import { useToast } from "@/hooks/use-toast";

const mockUserId = "user-1";

export default function OrderEntry() {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  
  const { currentSymbol } = useTradingStore();
  const { toast } = useToast();
  
  // Get available symbols for fallback
  const { data: symbols = [] } = useQuery<any[]>({
    queryKey: ['/api/symbols'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', mockUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/positions', mockUserId] });
      setAmount('');
      setPrice('');
      setStopPrice('');
      toast({
        title: "Order Placed",
        description: "Your order has been successfully placed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitOrder = () => {
    if (!amount) {
      toast({
        title: "Validation Error",
        description: "Please enter an amount",
        variant: "destructive",
      });
      return;
    }

    if (orderType === 'limit' && !price) {
      toast({
        title: "Validation Error",
        description: "Please enter a price for limit orders",
        variant: "destructive",
      });
      return;
    }

    if (orderType === 'stop' && !stopPrice) {
      toast({
        title: "Validation Error",
        description: "Please enter a stop price for stop orders",
        variant: "destructive",
      });
      return;
    }

    // Use current symbol or find BTCUSDT as fallback
    let symbolId = currentSymbol?.id;
    if (!symbolId && symbols.length > 0) {
      const btcSymbol = symbols.find(s => s.symbol === 'BTCUSDT');
      symbolId = btcSymbol?.id || symbols[0]?.id;
    }
    
    if (!symbolId) {
      toast({
        title: "Error",
        description: "No trading symbol available",
        variant: "destructive",
      });
      return;
    }
    
    const orderData = {
      userId: mockUserId,
      symbolId,
      side,
      type: orderType,
      quantity: amount,
      ...(orderType === 'limit' && { price }),
      ...(orderType === 'stop' && { stopPrice }),
    };

    console.log('Submitting order:', orderData);
    createOrderMutation.mutate(orderData);
  };

  const quickAmountButtons = [25, 50, 75, 100];

  return (
    <div className="p-4 border-b border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Quick Order</h3>
      
      <div className="space-y-3">
        {/* Order Type */}
        <div className="flex space-x-1 bg-muted rounded-lg p-1">
          {['market', 'limit', 'stop'].map((type) => (
            <Button
              key={type}
              variant={orderType === type ? "default" : "ghost"}
              size="sm"
              className="flex-1 capitalize"
              onClick={() => setOrderType(type as any)}
              data-testid={`button-order-type-${type}`}
            >
              {type}
            </Button>
          ))}
        </div>
        
        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === 'buy' ? "default" : "outline"}
            className={side === 'buy' ? "bg-secondary hover:bg-secondary/80" : "border-secondary text-secondary hover:bg-secondary/10"}
            onClick={() => setSide('buy')}
            data-testid="button-side-buy"
          >
            BUY
          </Button>
          <Button
            variant={side === 'sell' ? "default" : "outline"}
            className={side === 'sell' ? "bg-destructive hover:bg-destructive/80" : "border-destructive text-destructive hover:bg-destructive/10"}
            onClick={() => setSide('sell')}
            data-testid="button-side-sell"
          >
            SELL
          </Button>
        </div>
        
        {/* Amount Input */}
        <div>
          <Label htmlFor="amount" className="text-xs text-muted-foreground">
            Amount (USDT)
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono"
            data-testid="input-amount"
          />
        </div>

        {/* Price Input (for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <Label htmlFor="price" className="text-xs text-muted-foreground">
              Price (USDT)
            </Label>
            <Input
              id="price"
              type="number"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="font-mono"
              data-testid="input-price"
            />
          </div>
        )}

        {/* Stop Price Input (for stop orders) */}
        {orderType === 'stop' && (
          <div>
            <Label htmlFor="stopPrice" className="text-xs text-muted-foreground">
              Stop Price (USDT)
            </Label>
            <Input
              id="stopPrice"
              type="number"
              placeholder="0.00"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className="font-mono"
              data-testid="input-stop-price"
            />
          </div>
        )}
        
        {/* Quick Amounts */}
        <div className="grid grid-cols-4 gap-1 text-xs">
          {quickAmountButtons.map((percent) => (
            <Button
              key={percent}
              variant="outline"
              size="sm"
              onClick={() => {
                // Calculate amount based on available balance
                const calculatedAmount = (15230.45 * percent / 100).toFixed(2);
                setAmount(calculatedAmount);
              }}
              data-testid={`button-quick-${percent}`}
            >
              {percent}%
            </Button>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={handleSubmitOrder}
          disabled={!amount || createOrderMutation.isPending}
          data-testid="button-submit-order"
        >
          {createOrderMutation.isPending 
            ? 'Placing Order...' 
            : `${side.toUpperCase()} ${currentSymbol?.symbol || 'BTCUSDT'}`
          }
        </Button>
      </div>
    </div>
  );
}
