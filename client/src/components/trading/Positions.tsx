import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const mockUserId = "user-1";

export default function Positions() {
  const { data: positions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/positions', mockUserId],
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Positions</h3>
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Positions</h3>
      
      <div className="space-y-2">
        {(positions as any[]).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No open positions</p>
          </div>
        ) : (
          (positions as any[]).map((position: any) => {
            const pnl = parseFloat(position.pnl || '0');
            const pnlPercent = ((parseFloat(position.markPrice || '0') - parseFloat(position.entryPrice)) / parseFloat(position.entryPrice) * 100);
            
            return (
              <div
                key={position.id}
                className="bg-card rounded-lg p-3"
                data-testid={`position-${position.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-semibold">{position.symbol.symbol}</span>
                  <Badge 
                    variant={position.side === 'long' ? 'secondary' : 'destructive'}
                    data-testid={`badge-position-side-${position.side}`}
                  >
                    {position.side.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Size</div>
                    <div className="font-mono">{parseFloat(position.quantity).toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Entry Price</div>
                    <div className="font-mono">${parseFloat(position.entryPrice).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Mark Price</div>
                    <div className="font-mono">${parseFloat(position.markPrice || position.entryPrice).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">PnL</div>
                    <div className={`font-mono ${pnl >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
