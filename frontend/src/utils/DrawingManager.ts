/**
 * DrawingManager - Advanced drawing tools for TradingView charts
 *
 * Uses official TradingView lightweight-charts primitives API
 * Supports:
 * - Trendlines (two-point lines)
 * - Fibonacci retracements
 * - Horizontal/Vertical lines
 * - Rectangles/Channels
 * - Text annotations
 * - Arrows and shapes
 */

import { IChartApi, ISeriesApi, IPriceLine, Time, LineStyle, ISeriesPrimitive } from 'lightweight-charts';
import {
  TrendLinePrimitive,
  RectanglePrimitive,
  VerticalLinePrimitive,
  HorizontalLinePrimitive,
} from '../primitives';

export type DrawingType =
  | 'horizontal-line'
  | 'vertical-line'
  | 'trendline'
  | 'fibonacci'
  | 'rectangle'
  | 'text'
  | 'arrow-up'
  | 'arrow-down'
  | 'measure';

export interface Point {
  time: Time;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: Point[];
  color: string;
  lineWidth: number;
  lineStyle: LineStyle;
  text?: string;
  fibLevels?: number[];
  meta?: Record<string, unknown>;
}

export interface DrawingStorage {
  symbol: string;
  drawings: Drawing[];
  version: number;
}

export class DrawingManager {
  private chart: IChartApi;
  private series: ISeriesApi<'Candlestick'>;
  private drawings: Map<string, Drawing> = new Map();
  private primitives: Map<string, ISeriesPrimitive<Time>> = new Map();
  private priceLines: Map<string, IPriceLine> = new Map();
  private currentDrawing: Drawing | null = null;
  private storageKey: string;

  constructor(chart: IChartApi, series: ISeriesApi<'Candlestick'>, symbol: string) {
    this.chart = chart;
    this.series = series;
    this.storageKey = `chart-drawings-${symbol}`;

    this.loadFromStorage();
  }

  /**
   * Start a new drawing
   */
  startDrawing(type: DrawingType, point: Point, text?: string): void {
    this.currentDrawing = {
      id: this.generateId(),
      type,
      points: [point],
      color: this.getDefaultColor(type),
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      fibLevels: type === 'fibonacci' ? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] : undefined,
      text: text,
    };
  }

  /**
   * Add point to current drawing
   */
  addPoint(point: Point): boolean {
    if (!this.currentDrawing) return false;

    this.currentDrawing.points.push(point);

    // Check if drawing is complete
    const isComplete = this.isDrawingComplete(this.currentDrawing);

    if (isComplete) {
      this.finalizeDrawing();
    }

    return isComplete;
  }

  /**
   * Finalize and render current drawing
   */
  private finalizeDrawing(): void {
    if (!this.currentDrawing) return;

    this.drawings.set(this.currentDrawing.id, { ...this.currentDrawing });
    this.renderDrawing(this.currentDrawing);
    this.saveToStorage();
    this.currentDrawing = null;
  }

  /**
   * Cancel current drawing
   */
  cancelDrawing(): void {
    this.currentDrawing = null;
  }

  /**
   * Check if drawing needs more points
   */
  private isDrawingComplete(drawing: Drawing): boolean {
    switch (drawing.type) {
      case 'horizontal-line':
      case 'vertical-line':
      case 'text':
      case 'arrow-up':
      case 'arrow-down':
        return drawing.points.length >= 1;

      case 'trendline':
      case 'measure':
        return drawing.points.length >= 2;

      case 'fibonacci':
      case 'rectangle':
        return drawing.points.length >= 2;

      default:
        return false;
    }
  }

  /**
   * Render a drawing on the chart using primitives
   */
  private renderDrawing(drawing: Drawing): void {
    switch (drawing.type) {
      case 'horizontal-line':
        this.renderHorizontalLine(drawing);
        break;

      case 'vertical-line':
        this.renderVerticalLine(drawing);
        break;

      case 'trendline':
        this.renderTrendline(drawing);
        break;

      case 'rectangle':
        this.renderRectangle(drawing);
        break;

      case 'fibonacci':
        this.renderFibonacci(drawing);
        break;

      case 'arrow-up':
      case 'arrow-down':
        this.renderArrow(drawing);
        break;

      case 'measure':
        this.renderMeasure(drawing);
        break;

      case 'text':
        // Text can be implemented as a custom primitive or using markers
        console.warn('Text primitive not yet implemented');
        break;
    }
  }

  /**
   * Render horizontal line using primitive
   */
  private renderHorizontalLine(drawing: Drawing): void {
    const point = drawing.points[0];

    const primitive = new HorizontalLinePrimitive({
      price: point.price,
      color: drawing.color,
      width: drawing.lineWidth,
      lineStyle: this.convertLineStyle(drawing.lineStyle),
      label: drawing.text || `${point.price.toFixed(2)}`,
    });

    this.series.attachPrimitive(primitive);
    this.primitives.set(drawing.id, primitive);
  }

  /**
   * Render vertical line using primitive
   */
  private renderVerticalLine(drawing: Drawing): void {
    const point = drawing.points[0];

    const primitive = new VerticalLinePrimitive(point.time, {
      color: drawing.color,
      width: drawing.lineWidth,
      lineStyle: this.convertLineStyle(drawing.lineStyle),
      label: drawing.text,
    });

    this.series.attachPrimitive(primitive);
    this.primitives.set(drawing.id, primitive);
  }

  /**
   * Render trendline using primitive (now a real line, not two dots!)
   */
  private renderTrendline(drawing: Drawing): void {
    if (drawing.points.length < 2) return;

    const [point1, point2] = drawing.points;

    const primitive = new TrendLinePrimitive(
      { time: point1.time, price: point1.price },
      { time: point2.time, price: point2.price },
      {
        color: drawing.color,
        width: drawing.lineWidth,
        lineStyle: this.convertLineStyle(drawing.lineStyle),
      }
    );

    this.series.attachPrimitive(primitive);
    this.primitives.set(drawing.id, primitive);
  }

  /**
   * Render rectangle using primitive
   */
  private renderRectangle(drawing: Drawing): void {
    if (drawing.points.length < 2) return;

    const [point1, point2] = drawing.points;

    const primitive = new RectanglePrimitive(
      { time: point1.time, price: point1.price },
      { time: point2.time, price: point2.price },
      {
        fillColor: this.hexToRgba(drawing.color, 0.3),
        borderColor: drawing.color,
        borderWidth: drawing.lineWidth,
        fillOpacity: 0.3,
      }
    );

    this.series.attachPrimitive(primitive);
    this.primitives.set(drawing.id, primitive);
  }

  /**
   * Render arrow marker using price line
   */
  private renderArrow(drawing: Drawing): void {
    if (drawing.points.length < 1) return;

    const point = drawing.points[0];
    const isUp = drawing.type === 'arrow-up';

    const priceLine = this.series.createPriceLine({
      price: point.price,
      color: isUp ? '#00ff00' : '#ff0000',
      lineWidth: 2 as any,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: isUp ? '↑' : '↓',
    });

    this.priceLines.set(drawing.id, priceLine);
  }

  /**
   * Render measure tool (shows price range)
   */
  private renderMeasure(drawing: Drawing): void {
    if (drawing.points.length < 2) return;

    const [point1, point2] = drawing.points;
    const priceRange = Math.abs(point2.price - point1.price);
    const percentChange = ((priceRange / point1.price) * 100).toFixed(2);

    // Create price lines at both endpoints
    const line1 = this.series.createPriceLine({
      price: point1.price,
      color: '#FFD700',
      lineWidth: 1 as any,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `📏 Start`,
    });

    const line2 = this.series.createPriceLine({
      price: point2.price,
      color: '#FFD700',
      lineWidth: 1 as any,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `Δ ${percentChange}%`,
    });

    this.priceLines.set(`${drawing.id}-start`, line1);
    this.priceLines.set(`${drawing.id}-end`, line2);
  }

  /**
   * Render Fibonacci retracements using price lines
   */
  private renderFibonacci(drawing: Drawing): void {
    if (drawing.points.length < 2 || !drawing.fibLevels) return;

    const [point1, point2] = drawing.points;
    const priceRange = Math.abs(point2.price - point1.price);
    const isUpward = point2.price > point1.price;
    const basePrice = isUpward ? point1.price : point2.price;

    // Create price line for each Fibonacci level
    drawing.fibLevels.forEach((level) => {
      const price = isUpward
        ? basePrice + (priceRange * level)
        : basePrice + (priceRange * (1 - level));

      const priceLine = this.series.createPriceLine({
        price,
        color: this.getFibColor(level),
        lineWidth: 1 as any,
        lineStyle: level === 0 || level === 1 ? LineStyle.Solid : LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Fib ${(level * 100).toFixed(1)}%`,
      });

      this.priceLines.set(`${drawing.id}-fib-${level}`, priceLine);
    });
  }

  /**
   * Remove a drawing by ID
   */
  removeDrawing(id: string): void {
    const drawing = this.drawings.get(id);
    if (!drawing) return;

    // Remove primitive if exists
    const primitive = this.primitives.get(id);
    if (primitive) {
      this.series.detachPrimitive(primitive);
      this.primitives.delete(id);
    }

    // Remove price lines based on drawing type
    if (drawing.type === 'fibonacci') {
      // Fibonacci has multiple levels
      drawing.fibLevels?.forEach(level => {
        const lineId = `${id}-fib-${level}`;
        const priceLine = this.priceLines.get(lineId);
        if (priceLine) {
          this.series.removePriceLine(priceLine);
          this.priceLines.delete(lineId);
        }
      });
    } else if (drawing.type === 'measure') {
      // Measure has start/end points
      ['start', 'end'].forEach(suffix => {
        const lineId = `${id}-${suffix}`;
        const priceLine = this.priceLines.get(lineId);
        if (priceLine) {
          this.series.removePriceLine(priceLine);
          this.priceLines.delete(lineId);
        }
      });
    } else {
      // Single price line (for arrows)
      const priceLine = this.priceLines.get(id);
      if (priceLine) {
        this.series.removePriceLine(priceLine);
        this.priceLines.delete(id);
      }
    }

    this.drawings.delete(id);
    this.saveToStorage();
  }

  /**
   * Remove all drawings
   */
  clearAll(): void {
    // Remove all primitives
    this.primitives.forEach(primitive => {
      this.series.detachPrimitive(primitive);
    });
    this.primitives.clear();

    // Remove all price lines
    this.priceLines.forEach(priceLine => {
      this.series.removePriceLine(priceLine);
    });
    this.priceLines.clear();

    this.drawings.clear();
    this.saveToStorage();
  }

  /**
   * Get all drawings
   */
  getAllDrawings(): Drawing[] {
    return Array.from(this.drawings.values());
  }

  /**
   * Refresh all drawings (useful when chart data changes)
   */
  refreshDrawings(): void {
    // Clear all primitives and price lines
    this.primitives.forEach(primitive => {
      this.series.detachPrimitive(primitive);
    });
    this.primitives.clear();

    this.priceLines.forEach(priceLine => {
      this.series.removePriceLine(priceLine);
    });
    this.priceLines.clear();

    // Re-render all drawings
    this.drawings.forEach(drawing => {
      this.renderDrawing(drawing);
    });
  }

  /**
   * Save drawings to localStorage
   */
  private saveToStorage(): void {
    const data: DrawingStorage = {
      symbol: this.storageKey,
      drawings: this.getAllDrawings(),
      version: 1,
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save drawings:', error);
    }
  }

  /**
   * Load drawings from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data: DrawingStorage = JSON.parse(stored);

      data.drawings.forEach(drawing => {
        this.drawings.set(drawing.id, drawing);
        this.renderDrawing(drawing);
      });
    } catch (error) {
      console.error('Failed to load drawings:', error);
    }
  }

  /**
   * Export drawings as JSON
   */
  exportDrawings(): string {
    return JSON.stringify({
      symbol: this.storageKey,
      drawings: this.getAllDrawings(),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import drawings from JSON
   */
  importDrawings(json: string): void {
    try {
      const data = JSON.parse(json);

      if (!data.drawings || !Array.isArray(data.drawings)) {
        throw new Error('Invalid drawings format');
      }

      this.clearAll();

      data.drawings.forEach((drawing: Drawing) => {
        this.drawings.set(drawing.id, drawing);
        this.renderDrawing(drawing);
      });

      this.saveToStorage();
    } catch (error) {
      console.error('Failed to import drawings:', error);
      throw error;
    }
  }

  /**
   * Helper: Generate unique ID
   */
  private generateId(): string {
    return `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Get default color for drawing type
   */
  private getDefaultColor(type: DrawingType): string {
    const colors: Record<DrawingType, string> = {
      'horizontal-line': '#3179F5',
      'vertical-line': '#3179F5',
      'trendline': '#FF6B00',
      'fibonacci': '#9C27B0',
      'rectangle': '#4CAF50',
      'text': '#FFFFFF',
      'arrow-up': '#00FF00',
      'arrow-down': '#FF0000',
      'measure': '#FFD700',
    };

    return colors[type] || '#3179F5';
  }

  /**
   * Helper: Get Fibonacci level color
   */
  private getFibColor(level: number): string {
    if (level === 0 || level === 1) return '#888888';
    if (level === 0.5) return '#FF9800';
    if (level === 0.618) return '#F44336';
    return '#9C27B0';
  }

  /**
   * Helper: Convert LineStyle enum to number for primitives
   */
  private convertLineStyle(style: LineStyle): number {
    switch (style) {
      case LineStyle.Solid:
        return 0;
      case LineStyle.Dotted:
        return 1;
      case LineStyle.Dashed:
        return 2;
      case LineStyle.LargeDashed:
        return 3;
      case LineStyle.SparseDotted:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Helper: Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Get current drawing state (for UI feedback)
   */
  getCurrentDrawing(): Drawing | null {
    return this.currentDrawing;
  }

  /**
   * Update drawing properties
   */
  updateDrawing(id: string, updates: Partial<Drawing>): void {
    const drawing = this.drawings.get(id);
    if (!drawing) return;

    Object.assign(drawing, updates);

    // Re-render the drawing with new properties
    this.removeDrawing(id);
    this.drawings.set(id, drawing);
    this.renderDrawing(drawing);
    this.saveToStorage();
  }
}
