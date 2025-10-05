import { storage } from "./storage";
import type { Order, Position, InsertOrder, InsertPosition } from "@shared/schema";

export interface OrderExecutionResult {
  success: boolean;
  order?: Order;
  position?: Position;
  message?: string;
}

export class PaperTradingEngine {
  /**
   * Execute a paper trading order
   * Simulates order execution and creates positions
   */
  async executeOrder(orderData: InsertOrder, currentPrice: number): Promise<OrderExecutionResult> {
    try {
      // Validate order data
      if (!orderData.userId || !orderData.symbolId || !orderData.side || !orderData.quantity) {
        return {
          success: false,
          message: "Missing required order fields"
        };
      }

      // Get symbol information
      const symbol = await storage.getSymbol(orderData.symbolId);
      if (!symbol) {
        return {
          success: false,
          message: "Symbol not found"
        };
      }

      // Calculate order value
      const orderPrice = orderData.price ? parseFloat(orderData.price) : currentPrice;
      const quantity = parseFloat(orderData.quantity);
      const orderValue = orderPrice * quantity;

      // Check if user has sufficient balance (simplified - assumes $100k initial capital)
      const userPositions = await storage.getPositions(orderData.userId);
      const totalPositionValue = userPositions.reduce((sum, pos) => {
        return sum + (parseFloat(pos.quantity) * parseFloat(pos.entryPrice));
      }, 0);

      const initialCapital = 100000;
      const availableBalance = initialCapital - totalPositionValue;

      if (orderData.side === 'buy' && orderValue > availableBalance) {
        return {
          success: false,
          message: "Insufficient balance for this order"
        };
      }

      // Create order record
      const orderCreateData: InsertOrder = {
        ...orderData,
        price: orderPrice.toString(),
      };

      const order = await storage.createOrder(orderCreateData);

      // Update order to filled status
      const filledOrder = await storage.updateOrder(order.id, {
        status: 'filled',
      });

      // For market orders or limit orders that can fill immediately
      if (orderData.type === 'market' || this.canLimitOrderFill(orderData, currentPrice)) {
        // Check if we have an existing position for this symbol
        const existingPosition = userPositions.find(p => p.symbolId === orderData.symbolId);

        if (existingPosition) {
          // Update existing position
          const existingQty = parseFloat(existingPosition.quantity);
          const existingEntryPrice = parseFloat(existingPosition.entryPrice);

          if (existingPosition.side === orderData.side) {
            // Add to position - calculate new average entry price
            const newQty = existingQty + quantity;
            const newEntryPrice = ((existingQty * existingEntryPrice) + (quantity * orderPrice)) / newQty;

            const updatedPosition = await storage.updatePosition(existingPosition.id, {
              quantity: newQty.toString(),
              entryPrice: newEntryPrice.toString(),
            });

            return {
              success: true,
              order: filledOrder,
              position: updatedPosition,
              message: "Order executed, position updated"
            };
          } else {
            // Opposite side - reduce or close position
            if (quantity >= existingQty) {
              // Close position entirely
              await storage.closePosition(existingPosition.id);

              // If quantity exceeds existing, open new position in opposite direction
              if (quantity > existingQty) {
                const newPosition = await storage.createPosition({
                  userId: orderData.userId,
                  symbolId: orderData.symbolId,
                  side: orderData.side,
                  quantity: (quantity - existingQty).toString(),
                  entryPrice: orderPrice.toString(),
                });

                return {
                  success: true,
                  order: filledOrder,
                  position: newPosition,
                  message: "Position closed and new position opened"
                };
              }

              return {
                success: true,
                order: filledOrder,
                message: "Position closed"
              };
            } else {
              // Reduce position
              const updatedPosition = await storage.updatePosition(existingPosition.id, {
                quantity: (existingQty - quantity).toString(),
              });

              return {
                success: true,
                order: filledOrder,
                position: updatedPosition,
                message: "Position reduced"
              };
            }
          }
        } else {
          // Create new position
          const newPosition = await storage.createPosition({
            userId: orderData.userId,
            symbolId: orderData.symbolId,
            side: orderData.side,
            quantity: orderData.quantity,
            entryPrice: orderPrice.toString(),
          });

          return {
            success: true,
            order: filledOrder,
            position: newPosition,
            message: "Order executed, new position opened"
          };
        }
      } else {
        // Limit order placed but not filled
        const pendingOrder = await storage.updateOrder(order.id, { status: 'pending' });
        return {
          success: true,
          order: pendingOrder,
          message: "Limit order placed"
        };
      }
    } catch (error) {
      console.error("Order execution error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Order execution failed"
      };
    }
  }

  /**
   * Check if a limit order can be filled at current price
   */
  private canLimitOrderFill(orderData: InsertOrder, currentPrice: number): boolean {
    if (orderData.type !== 'limit' || !orderData.price) {
      return false;
    }

    const limitPrice = parseFloat(orderData.price);

    if (orderData.side === 'buy') {
      // Buy limit order fills if current price <= limit price
      return currentPrice <= limitPrice;
    } else {
      // Sell limit order fills if current price >= limit price
      return currentPrice >= limitPrice;
    }
  }

  /**
   * Calculate unrealized P&L for a position
   */
  calculateUnrealizedPnL(position: Position, currentPrice: number): number {
    const quantity = parseFloat(position.quantity);
    const entryPrice = parseFloat(position.entryPrice);

    if (position.side === 'buy') {
      return (currentPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - currentPrice) * quantity;
    }
  }

  /**
   * Check and execute pending limit orders
   */
  async checkPendingOrders(symbolId: string, currentPrice: number): Promise<void> {
    // This would be called periodically to check if any pending limit orders can now be filled
    // Implementation would query pending orders for the symbol and execute those that can fill
  }
}

export const paperTradingEngine = new PaperTradingEngine();
