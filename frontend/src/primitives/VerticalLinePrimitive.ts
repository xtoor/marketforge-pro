/**
 * VerticalLine Primitive for TradingView lightweight-charts
 *
 * Draws a vertical line at a specific time
 * Based on Stack Overflow implementation and official patterns
 */

import {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  Time,
  ISeriesPrimitivePaneView,
  ISeriesPrimitivePaneRenderer,
  Coordinate,
} from 'lightweight-charts';
import { positionsLine } from './helpers';

export interface VerticalLineOptions {
  color: string;
  width: number;
  lineStyle: number; // 0 = solid, 1 = dotted, 2 = dashed
  label?: string;
}

// RENDERER - Draws the vertical line on canvas
class VertLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
  private _x: Coordinate | null = null;
  private _options: VerticalLineOptions;

  constructor(x: Coordinate | null, options: VerticalLineOptions) {
    this._x = x;
    this._options = options;
  }

  draw(target: any): void {
    if (this._x === null) return;

    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context;

      const position = positionsLine(
        this._x as number,
        scope.horizontalPixelRatio,
        this._options.width
      );

      ctx.fillStyle = this._options.color;
      ctx.fillRect(
        position.position,
        0,
        position.length,
        scope.bitmapSize.height
      );

      // Draw label if provided
      if (this._options.label) {
        const scaledX = Math.round((this._x as number) * scope.horizontalPixelRatio);
        ctx.fillStyle = this._options.color;
        ctx.font = `${12 * scope.verticalPixelRatio}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          this._options.label,
          scaledX,
          10 * scope.verticalPixelRatio
        );
      }
    });
  }
}

// VIEW - Manages coordinate conversion
class VertLinePaneView implements ISeriesPrimitivePaneView {
  private _source: VerticalLinePrimitive;
  private _x: Coordinate | null = null;

  constructor(source: VerticalLinePrimitive) {
    this._source = source;
  }

  update(): void {
    const timeScale = this._source._chart.timeScale();
    this._x = timeScale.timeToCoordinate(this._source._time);
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    return new VertLinePaneRenderer(this._x, this._source._options);
  }
}

// PRIMITIVE - Main class
export class VerticalLinePrimitive implements ISeriesPrimitive {
  _chart: any;
  _series: any;
  _time: Time;
  _options: VerticalLineOptions;
  private _paneViews: VertLinePaneView[];
  private _requestUpdate?: () => void;

  constructor(time: Time, options: Partial<VerticalLineOptions> = {}) {
    this._time = time;

    const defaultOptions: VerticalLineOptions = {
      color: '#3179F5',
      width: 2,
      lineStyle: 0, // solid
    };
    this._options = { ...defaultOptions, ...options };

    this._paneViews = [new VertLinePaneView(this)];
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
   * Update the line time position
   */
  updateTime(time: Time): void {
    this._time = time;
    this._requestUpdate?.();
  }

  /**
   * Update line appearance
   */
  updateOptions(options: Partial<VerticalLineOptions>): void {
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }
}
