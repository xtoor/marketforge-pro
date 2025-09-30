import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const mockUserId = "user-1";

export default function TradeHistory() {
  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/orders', mockUserId],
  });

  const filledOrders = (orders as any[]).filter((order: any) => order.status === 'filled');

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Recent Trades</h3>
        <div className="animate-pulse space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Recent Trades</h3>
      
      <div className="space-y-1 text-xs">
        {filledOrders.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No trade history</p>
          </div>
        ) : (
          filledOrders.slice(0, 10).map((trade: any) => (
            <div
              key={trade.id}
              className="flex items-center justify-between py-1"
              data-testid={`trade-${trade.id}`}
            >
              <div className="flex items-center space-x-2">
                <span className="font-mono">{trade.symbol.symbol}</span>
                <Badge 
                  variant={trade.side === 'buy' ? 'secondary' : 'destructive'}
                  className="text-xs px-1"
                >
                  {trade.side.toUpperCase()}
                </Badge>
              </div>
              <div className="text-right">
                <div className="font-mono">
                  {parseFloat(trade.quantity).toFixed(4)} @ ${parseFloat(trade.price || '0').toLocaleString()}
                </div>
                <div className="text-muted-foreground">
                  {new Date(trade.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
