/**
 * CanvasDrawingLayer - Canvas overlay for advanced drawing tools
 *
 * Provides canvas-based rendering for:
 * - Vertical lines
 * - Rectangles/channels
 * - Text annotations
 * - Custom shapes
 */

import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { Drawing } from './DrawingManager';

export class CanvasDrawingLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chart: IChartApi;
  private series: ISeriesApi<'Candlestick'>;
  private container: HTMLElement;
  private drawings: Drawing[] = [];

  constructor(
    container: HTMLElement,
    chart: IChartApi,
    series: ISeriesApi<'Candlestick'>
  ) {
    this.container = container;
    this.chart = chart;
    this.series = series;

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.canvas.style.zIndex = '100';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // Add canvas to container
    container.appendChild(this.canvas);

    // Set initial size
    this.resize();

    // Subscribe to chart updates
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      this.redraw();
    });

    // Handle window resize
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Resize canvas to match container
   */
  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.redraw();
  }

  /**
   * Clear canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Redraw all drawings
   */
  redraw(): void {
    this.clear();
    this.drawings.forEach(drawing => this.drawShape(drawing));
  }

  /**
   * Add drawing to canvas
   */
  addDrawing(drawing: Drawing): void {
    this.drawings.push(drawing);
    this.redraw();
  }

  /**
   * Remove drawing by ID
   */
  removeDrawing(id: string): void {
    this.drawings = this.drawings.filter(d => d.id !== id);
    this.redraw();
  }

  /**
   * Clear all drawings
   */
  clearAll(): void {
    this.drawings = [];
    this.clear();
  }

  /**
   * Get all drawings
   */
  getDrawings(): Drawing[] {
    return [...this.drawings];
  }

  /**
   * Convert time to X coordinate
   */
  private timeToCoordinate(time: Time): number | null {
    try {
      const coordinate = this.chart.timeScale().timeToCoordinate(time);
      return coordinate ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Convert price to Y coordinate
   */
  private priceToCoordinate(price: number): number | null {
    try {
      const coordinate = this.series.priceToCoordinate(price);
      return coordinate ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Draw a shape on canvas
   */
  private drawShape(drawing: Drawing): void {
    switch (drawing.type) {
      case 'vertical-line':
        this.drawVerticalLine(drawing);
        break;
      case 'rectangle':
        this.drawRectangle(drawing);
        break;
      case 'text':
        this.drawText(drawing);
        break;
    }
  }

  /**
   * Draw vertical line
   */
  private drawVerticalLine(drawing: Drawing): void {
    if (drawing.points.length < 1) return;

    const point = drawing.points[0];
    const x = this.timeToCoordinate(point.time);

    if (x === null) return;

    this.ctx.save();
    this.ctx.strokeStyle = drawing.color;
    this.ctx.lineWidth = drawing.lineWidth;
    this.ctx.setLineDash(this.getLineDash(drawing.lineStyle));

    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw rectangle
   */
  private drawRectangle(drawing: Drawing): void {
    if (drawing.points.length < 2) return;

    const [point1, point2] = drawing.points;

    const x1 = this.timeToCoordinate(point1.time);
    const y1 = this.priceToCoordinate(point1.price);
    const x2 = this.timeToCoordinate(point2.time);
    const y2 = this.priceToCoordinate(point2.price);

    if (x1 === null || y1 === null || x2 === null || y2 === null) return;

    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    this.ctx.save();
    this.ctx.strokeStyle = drawing.color;
    this.ctx.lineWidth = drawing.lineWidth;
    this.ctx.setLineDash(this.getLineDash(drawing.lineStyle));

    // Draw rectangle border
    this.ctx.strokeRect(x, y, width, height);

    // Optional: Fill with semi-transparent color
    this.ctx.fillStyle = drawing.color + '20'; // 20 = ~12% opacity
    this.ctx.fillRect(x, y, width, height);

    this.ctx.restore();
  }

  /**
   * Draw text annotation
   */
  private drawText(drawing: Drawing): void {
    if (drawing.points.length < 1 || !drawing.text) return;

    const point = drawing.points[0];
    const x = this.timeToCoordinate(point.time);
    const y = this.priceToCoordinate(point.price);

    if (x === null || y === null) return;

    this.ctx.save();
    this.ctx.fillStyle = drawing.color;
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Draw background box
    const metrics = this.ctx.measureText(drawing.text);
    const padding = 6;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = 20;

    this.ctx.fillStyle = 'rgba(30, 34, 45, 0.9)';
    this.ctx.fillRect(
      x - boxWidth / 2,
      y - boxHeight / 2,
      boxWidth,
      boxHeight
    );

    // Draw text
    this.ctx.fillStyle = drawing.color;
    this.ctx.fillText(drawing.text, x, y);

    this.ctx.restore();
  }

  /**
   * Get line dash pattern from LineStyle
   */
  private getLineDash(lineStyle: number): number[] {
    switch (lineStyle) {
      case 0: // Solid
        return [];
      case 1: // Dotted
        return [2, 2];
      case 2: // Dashed
        return [6, 3];
      case 3: // LargeDashed
        return [12, 6];
      case 4: // SparseDotted
        return [1, 4];
      default:
        return [];
    }
  }

  /**
   * Update drawings array (for external updates)
   */
  setDrawings(drawings: Drawing[]): void {
    this.drawings = drawings.filter(d =>
      d.type === 'vertical-line' ||
      d.type === 'rectangle' ||
      d.type === 'text'
    );
    this.redraw();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    window.removeEventListener('resize', () => this.resize());
    this.canvas.remove();
  }
}
