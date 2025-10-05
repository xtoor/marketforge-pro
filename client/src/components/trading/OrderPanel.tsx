import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTradingStore } from "@/stores/tradingStore";

const mockUserId = "user-1";

export default function OrderPanel() {
  const { currentSymbol } = useTradingStore();
  const { toast } = useToast();

  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Order failed');
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Order Executed",
        description: data.message || "Order placed successfully",
        variant: "default",
      });

      // Refresh positions and orders
      queryClient.invalidateQueries({ queryKey: ['/api/positions', mockUserId] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', mockUserId] });

      // Reset form
      setQuantity('');
      setLimitPrice('');
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (!currentSymbol) {
      toast({
        title: "No Symbol Selected",
        description: "Please select a trading symbol first",
        variant: "destructive",
      });
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      toast({
        title: "Invalid Limit Price",
        description: "Please enter a valid limit price",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      userId: mockUserId,
      symbolId: currentSymbol.id,
      side,
      type: orderType,
      quantity,
      ...(orderType === 'limit' && { price: limitPrice }),
    };

    placeOrderMutation.mutate(orderData);
  };

  return (
    <div className="p-4 border-b border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Paper Trading</h3>

      <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <TrendingUp className="h-4 w-4 mr-2" />
            Buy
          </TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
            <TrendingDown className="h-4 w-4 mr-2" />
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-4 mt-4">
          <OrderForm
            orderType={orderType}
            setOrderType={setOrderType}
            quantity={quantity}
            setQuantity={setQuantity}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            onSubmit={handlePlaceOrder}
            isPending={placeOrderMutation.isPending}
            buttonLabel="Place Buy Order"
            buttonClassName="bg-secondary hover:bg-secondary/80"
          />
        </TabsContent>

        <TabsContent value="sell" className="space-y-4 mt-4">
          <OrderForm
            orderType={orderType}
            setOrderType={setOrderType}
            quantity={quantity}
            setQuantity={setQuantity}
            limitPrice={limitPrice}
            setLimitPrice={setLimitPrice}
            onSubmit={handlePlaceOrder}
            isPending={placeOrderMutation.isPending}
            buttonLabel="Place Sell Order"
            buttonClassName="bg-destructive hover:bg-destructive/80"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface OrderFormProps {
  orderType: 'market' | 'limit';
  setOrderType: (type: 'market' | 'limit') => void;
  quantity: string;
  setQuantity: (qty: string) => void;
  limitPrice: string;
  setLimitPrice: (price: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  buttonLabel: string;
  buttonClassName?: string;
}

function OrderForm({
  orderType,
  setOrderType,
  quantity,
  setQuantity,
  limitPrice,
  setLimitPrice,
  onSubmit,
  isPending,
  buttonLabel,
  buttonClassName,
}: OrderFormProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="order-type">Order Type</Label>
        <Select value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
          <SelectTrigger id="order-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="market">Market Order</SelectItem>
            <SelectItem value="limit">Limit Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          step="0.0001"
          placeholder="0.00"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      {orderType === 'limit' && (
        <div className="space-y-2">
          <Label htmlFor="limit-price">Limit Price</Label>
          <Input
            id="limit-price"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
          />
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={isPending}
        className={`w-full ${buttonClassName}`}
      >
        {isPending ? 'Placing...' : buttonLabel}
      </Button>
    </>
  );
}
