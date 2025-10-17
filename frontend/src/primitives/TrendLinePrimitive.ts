/**
 * TrendLine Primitive for TradingView lightweight-charts
 *
 * Draws a line between two price/time points
 * Based on official TradingView plugin examples
 */

import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer,
  Coordinate,
} from 'lightweight-charts';
import { positionsLine, setLineStyle } from './helpers';

export interface TrendLinePoint {
  time: Time;
  price: number;
}

export interface TrendLineOptions {
  color: string;
  width: number;
  lineStyle: number; // 0 = solid, 1 = dotted, 2 = dashed
}

// RENDERER - Draws the line on canvas
class TrendLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
  private _p1: { x: Coordinate; y: Coordinate } | null = null;
  private _p2: { x: Coordinate; y: Coordinate } | null = null;
  private _options: TrendLineOptions;

  constructor(
    p1: { x: Coordinate; y: Coordinate } | null,
    p2: { x: Coordinate; y: Coordinate } | null,
    options: TrendLineOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = options;
  }

  draw(target: any): void {
    if (!this._p1 || !this._p2) return;

    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context;
      const scaledX1 = Math.round(this._p1!.x * scope.horizontalPixelRatio);
      const scaledY1 = Math.round(this._p1!.y * scope.verticalPixelRatio);
      const scaledX2 = Math.round(this._p2!.x * scope.horizontalPixelRatio);
      const scaledY2 = Math.round(this._p2!.y * scope.verticalPixelRatio);

      ctx.strokeStyle = this._options.color;
      ctx.lineWidth = this._options.width * scope.horizontalPixelRatio;
      setLineStyle(ctx, this._options.lineStyle);

      ctx.beginPath();
      ctx.moveTo(scaledX1, scaledY1);
      ctx.lineTo(scaledX2, scaledY2);
      ctx.stroke();

      // Draw endpoint circles for visual feedback
      const circleRadius = 4 * scope.horizontalPixelRatio;

      ctx.fillStyle = this._options.color;
      ctx.beginPath();
      ctx.arc(scaledX1, scaledY1, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(scaledX2, scaledY2, circleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset line dash
      ctx.setLineDash([]);
    });
  }
}

// VIEW - Manages coordinate conversion
class TrendLinePaneView implements ISeriesPrimitivePaneView {
  private _source: TrendLinePrimitive;
  private _p1: { x: Coordinate; y: Coordinate } | null = null;
  private _p2: { x: Coordinate; y: Coordinate } | null = null;

  constructor(source: TrendLinePrimitive) {
    this._source = source;
  }

  update(): void {
    const timeScale = this._source._chart.timeScale();
    const series = this._source._series;

    const p1 = this._source._point1;
    const p2 = this._source._point2;

    if (!p1 || !p2) {
      this._p1 = null;
      this._p2 = null;
      return;
    }

    const x1 = timeScale.timeToCoordinate(p1.time);
    const y1 = series.priceToCoordinate(p1.price);
    const x2 = timeScale.timeToCoordinate(p2.time);
    const y2 = series.priceToCoordinate(p2.price);

    if (x1 === null || y1 === null || x2 === null || y2 === null) {
      this._p1 = null;
      this._p2 = null;
      return;
    }

    this._p1 = { x: x1 as Coordinate, y: y1 as Coordinate };
    this._p2 = { x: x2 as Coordinate, y: y2 as Coordinate };
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    return new TrendLinePaneRenderer(this._p1, this._p2, this._source._options);
  }
}

// PRIMITIVE - Main class
export class TrendLinePrimitive implements ISeriesPrimitive {
  _chart: any;
  _series: any;
  _point1: TrendLinePoint;
  _point2: TrendLinePoint;
  _options: TrendLineOptions;
  private _paneViews: TrendLinePaneView[];
  private _requestUpdate?: () => void;

  constructor(
    point1: TrendLinePoint,
    point2: TrendLinePoint,
    options: Partial<TrendLineOptions> = {}
  ) {
    this._point1 = point1;
    this._point2 = point2;

    const defaultOptions: TrendLineOptions = {
      color: '#FF6B00',
      width: 2,
      lineStyle: 0, // solid
    };
    this._options = { ...defaultOptions, ...options };

    this._paneViews = [new TrendLinePaneView(this)];
  }

  updateAllViews(): void {
    this._paneViews.forEach((pw) => pw.update());
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return this._paneViews;
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;

    this._chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      this._requestUpdate?.();
    });
  }

  detached(): void {
    // Cleanup if needed
  }

  /**
   * Update the line endpoints
   */
  updatePoints(point1: TrendLinePoint, point2: TrendLinePoint): void {
    this._point1 = point1;
    this._point2 = point2;
    this._requestUpdate?.();
  }

  /**
   * Update line appearance
   */
  updateOptions(options: Partial<TrendLineOptions>): void {
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }
}
