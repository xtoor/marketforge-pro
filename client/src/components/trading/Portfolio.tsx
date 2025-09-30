import { useQuery } from "@tanstack/react-query";

const mockUserId = "user-1";

export default function Portfolio() {
  const { data: positions = [] } = useQuery({
    queryKey: ['/api/positions', mockUserId],
  });

  // Calculate portfolio totals
  const totalBalance = 125847.32;
  const dailyPnL = 2347.89;
  const available = 15230.45;
  const inOrders = 5847.12;

  return (
    <div className="p-4 border-b border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Portfolio</h3>
      
      <div className="space-y-3">
        <div className="bg-card rounded-lg p-3 neon-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-xs">Total Balance</span>
            <span className="font-mono text-lg font-bold text-primary" data-testid="text-total-balance">
              ${totalBalance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">P&L Today</span>
            <span 
              className={`font-mono text-sm ${dailyPnL >= 0 ? 'text-secondary' : 'text-destructive'}`}
              data-testid="text-daily-pnl"
            >
              {dailyPnL >= 0 ? '+' : ''}${Math.abs(dailyPnL).toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Available</span>
            <span className="font-mono" data-testid="text-available-balance">
              ${available.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>In Orders</span>
            <span className="font-mono" data-testid="text-in-orders">
              ${inOrders.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
