import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const mockUserId = "user-1";

interface Position {
  id: string;
  symbol: { symbol: string };
  side: string;
  quantity: string;
  entryPrice: string;
  currentPrice?: number;
  unrealizedPnl?: number;
}

export default function Portfolio() {
  const [showPositions, setShowPositions] = useState(false);

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['/api/positions', mockUserId],
    queryFn: async () => {
      const res = await fetch(`/api/positions/${mockUserId}`);
      if (!res.ok) throw new Error('Failed to fetch positions');
      return res.json();
    },
  });

  // Calculate portfolio totals from real positions
  const totalPositionValue = positions.reduce((sum, pos) => {
    const qty = parseFloat(pos.quantity);
    const price = pos.currentPrice || parseFloat(pos.entryPrice);
    return sum + (qty * price);
  }, 0);

  const totalUnrealizedPnL = positions.reduce((sum, pos) => {
    return sum + (pos.unrealizedPnl || 0);
  }, 0);

  const initialCapital = 100000; // Default starting capital
  const available = initialCapital - totalPositionValue;
  const totalBalance = initialCapital + totalUnrealizedPnL;

  return (
    <div className="p-4 border-b border-border">
      <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Portfolio</h3>

      <div className="space-y-3">
        <div className="bg-card rounded-lg p-3 neon-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground text-xs">Total Balance</span>
            <span className="font-mono text-lg font-bold text-primary" data-testid="text-total-balance">
              ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Unrealized P&L</span>
            <span
              className={`font-mono text-sm ${totalUnrealizedPnL >= 0 ? 'text-secondary' : 'text-destructive'}`}
              data-testid="text-daily-pnl"
            >
              {totalUnrealizedPnL >= 0 ? '+' : ''}${Math.abs(totalUnrealizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Available Cash</span>
            <span className="font-mono" data-testid="text-available-balance">
              ${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>In Positions</span>
            <span className="font-mono" data-testid="text-in-orders">
              ${totalPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Show positions list */}
        {positions.length > 0 && (
          <div>
            <button
              onClick={() => setShowPositions(!showPositions)}
              className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Positions ({positions.length})</span>
              {showPositions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPositions && (
              <div className="mt-2 space-y-2">
                {positions.map((pos) => {
                  const pnl = pos.unrealizedPnl || 0;
                  const pnlPercent = (pnl / (parseFloat(pos.quantity) * parseFloat(pos.entryPrice))) * 100;

                  return (
                    <div key={pos.id} className="bg-card/50 rounded p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-semibold">{pos.symbol.symbol}</span>
                        <span className={`font-mono ${pnl >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                          {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{pos.side.toUpperCase()} {parseFloat(pos.quantity).toFixed(4)}</span>
                        <span>${parseFloat(pos.entryPrice).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
