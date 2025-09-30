import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockUserId = "user-1";

export default function OpenOrders() {
  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders', mockUserId],
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to cancel order');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', mockUserId] });
    },
  });

  const openOrders = (orders as any[]).filter((order: any) => 
    order.status === 'pending' || order.status === 'partial'
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Open Orders</h3>
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Open Orders</h3>
      
      <div className="space-y-2">
        {openOrders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No open orders</p>
          </div>
        ) : (
          openOrders.map((order: any) => (
            <div
              key={order.id}
              className="bg-card rounded-lg p-3 border border-transparent hover:border-primary/30 transition-all"
              data-testid={`order-${order.id}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{order.symbol.symbol}</span>
                <Badge 
                  variant={order.type === 'limit' ? 'secondary' : order.type === 'stop' ? 'destructive' : 'default'}
                  data-testid={`badge-order-type-${order.type}`}
                >
                  {order.type.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Side</div>
                  <div className={`font-medium ${order.side === 'buy' ? 'text-secondary' : 'text-destructive'}`}>
                    {order.side.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Price</div>
                  <div className="font-mono">${parseFloat(order.price || '0').toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-mono">{parseFloat(order.quantity).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="capitalize">{order.status}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-destructive hover:bg-destructive/10"
                onClick={() => cancelOrderMutation.mutate(order.id)}
                disabled={cancelOrderMutation.isPending}
                data-testid={`button-cancel-${order.id}`}
              >
                {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
