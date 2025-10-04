import { storage } from "./storage";
import type { Alert, MarketData } from "@shared/schema";
import { WebSocket } from "ws";

interface AlertCheck {
  alert: Alert;
  currentValue: number;
  previousValue?: number;
}

export class AlertMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
  private previousValues: Map<string, number> = new Map();
  private connectedClients: Set<WebSocket>;

  constructor(clients: Set<WebSocket>) {
    this.connectedClients = clients;
  }

  start(): void {
    if (this.checkInterval) {
      console.log("Alert monitor already running");
      return;
    }

    console.log("Starting alert monitor...");
    this.checkInterval = setInterval(() => {
      this.checkAllAlerts().catch(error => {
        console.error("Error checking alerts:", error);
      });
    }, this.CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("Alert monitor stopped");
    }
  }

  private async checkAllAlerts(): Promise<void> {
    try {
      // Get all users with active alerts (in a real app, this would be optimized)
      // For now, we'll use a placeholder approach
      const symbols = await storage.getSymbols();

      for (const symbol of symbols) {
        // Get latest market data for this symbol
        const marketData = await storage.getMarketData(symbol.id, '1m', 1);
        if (marketData.length === 0) continue;

        const latestCandle = marketData[0];
        const currentPrice = parseFloat(latestCandle.close);

        // Check price-based alerts for this symbol
        await this.checkPriceAlerts(symbol.id, currentPrice);
      }
    } catch (error) {
      console.error("Error in checkAllAlerts:", error);
    }
  }

  private async checkPriceAlerts(symbolId: string, currentPrice: number): Promise<void> {
    // In a real implementation, we'd query by symbolId to be efficient
    // For now, this is a simplified version
    const key = `price_${symbolId}`;
    const previousPrice = this.previousValues.get(key);

    // Get all alerts (in production, filter by symbolId in the query)
    // This is simplified for demonstration

    // Store current price for next check
    this.previousValues.set(key, currentPrice);

    // Check conditions
    // Note: In production, you'd get alerts from database filtered by symbolId
    // and check each one's conditions here
  }

  private async triggerAlert(alert: Alert, currentValue: number): Promise<void> {
    console.log(`Alert triggered! Alert ID: ${alert.id}, Value: ${currentValue}`);

    // Broadcast alert to connected WebSocket clients
    this.broadcastAlert({
      type: 'alert_triggered',
      alertId: alert.id,
      symbolId: alert.symbolId,
      alertType: alert.type,
      condition: alert.condition,
      targetValue: alert.value,
      currentValue: currentValue.toString(),
      timestamp: new Date().toISOString()
    });

    // Optionally: Deactivate the alert after triggering
    // await storage.updateAlert(alert.id, { isActive: false });
  }

  private broadcastAlert(data: any): void {
    const message = JSON.stringify(data);
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private checkCondition(
    condition: string,
    currentValue: number,
    targetValue: number,
    previousValue?: number
  ): boolean {
    switch (condition) {
      case 'above':
        return currentValue > targetValue;

      case 'below':
        return currentValue < targetValue;

      case 'crosses_above':
        return previousValue !== undefined &&
               previousValue <= targetValue &&
               currentValue > targetValue;

      case 'crosses_below':
        return previousValue !== undefined &&
               previousValue >= targetValue &&
               currentValue < targetValue;

      default:
        return false;
    }
  }
}

export function createAlertMonitor(clients: Set<WebSocket>): AlertMonitor {
  return new AlertMonitor(clients);
}
