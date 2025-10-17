/**
 * Rectangle Primitive for TradingView lightweight-charts
 *
 * Draws a filled rectangle between two price/time points
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
import { positionsBox } from './helpers';

export interface RectanglePoint {
  time: Time;
  price: number;
}

export interface RectangleOptions {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  fillOpacity: number;
}

// RENDERER - Draws the rectangle on canvas
class RectanglePaneRenderer implements ISeriesPrimitivePaneRenderer {
  private _p1: { x: Coordinate; y: Coordinate } | null = null;
  private _p2: { x: Coordinate; y: Coordinate } | null = null;
  private _options: RectangleOptions;

  constructor(
    p1: { x: Coordinate; y: Coordinate } | null,
    p2: { x: Coordinate; y: Coordinate } | null,
    options: RectangleOptions
  ) {
    this._p1 = p1;
    this._p2 = p2;
    this._options = options;
  }

  draw(target: any): void {
    if (!this._p1 || !this._p2) return;

    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context;

      const xBox = positionsBox(
        this._p1!.x,
        this._p2!.x,
        scope.horizontalPixelRatio
      );
      const yBox = positionsBox(
        this._p1!.y,
        this._p2!.y,
        scope.verticalPixelRatio
      );

      // Draw fill
      ctx.fillStyle = this._options.fillColor;
      ctx.globalAlpha = this._options.fillOpacity;
      ctx.fillRect(xBox.position, yBox.position, xBox.length, yBox.length);

      // Draw border
      ctx.globalAlpha = 1;
      ctx.strokeStyle = this._options.borderColor;
      ctx.lineWidth = this._options.borderWidth * scope.horizontalPixelRatio;
      ctx.strokeRect(xBox.position, yBox.position, xBox.length, yBox.length);
    });
  }
}

// VIEW - Manages coordinate conversion
class RectanglePaneView implements ISeriesPrimitivePaneView {
  private _source: RectanglePrimitive;
  private _p1: { x: Coordinate; y: Coordinate } | null = null;
  private _p2: { x: Coordinate; y: Coordinate } | null = null;

  constructor(source: RectanglePrimitive) {
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
    return new RectanglePaneRenderer(this._p1, this._p2, this._source._options);
  }
}

// PRIMITIVE - Main class
export class RectanglePrimitive implements ISeriesPrimitive {
  _chart: any;
  _series: any;
  _point1: RectanglePoint;
  _point2: RectanglePoint;
  _options: RectangleOptions;
  private _paneViews: RectanglePaneView[];
  private _requestUpdate?: () => void;

  constructor(
    point1: RectanglePoint,
    point2: RectanglePoint,
    options: Partial<RectangleOptions> = {}
  ) {
    this._point1 = point1;
    this._point2 = point2;

    const defaultOptions: RectangleOptions = {
      fillColor: 'rgba(76, 175, 80, 0.3)',
      borderColor: '#4CAF50',
      borderWidth: 2,
      fillOpacity: 0.3,
    };
    this._options = { ...defaultOptions, ...options };

    this._paneViews = [new RectanglePaneView(this)];
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
   * Update the rectangle corners
   */
  updatePoints(point1: RectanglePoint, point2: RectanglePoint): void {
    this._point1 = point1;
    this._point2 = point2;
    this._requestUpdate?.();
  }

  /**
   * Update rectangle appearance
   */
  updateOptions(options: Partial<RectangleOptions>): void {
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }
}
