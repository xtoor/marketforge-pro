/**
 * HorizontalLine Primitive for TradingView lightweight-charts
 *
 * Draws a horizontal line at a specific price level
 * Alternative to IPriceLine with more customization options
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

export interface HorizontalLineOptions {
  price: number;
  color: string;
  width: number;
  lineStyle: number; // 0 = solid, 1 = dotted, 2 = dashed
  label?: string;
}

// RENDERER - Draws the horizontal line on canvas
class HorizLinePaneRenderer implements ISeriesPrimitivePaneRenderer {
  private _y: Coordinate | null = null;
  private _options: HorizontalLineOptions;

  constructor(y: Coordinate | null, options: HorizontalLineOptions) {
    this._y = y;
    this._options = options;
  }

  draw(target: any): void {
    if (this._y === null) return;

    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx = scope.context;

      const position = positionsLine(
        this._y as number,
        scope.verticalPixelRatio,
        this._options.width
      );

      ctx.fillStyle = this._options.color;
      ctx.fillRect(
        0,
        position.position,
        scope.bitmapSize.width,
        position.length
      );

      // Draw label if provided
      if (this._options.label) {
        const scaledY = Math.round((this._y as number) * scope.verticalPixelRatio);
        ctx.fillStyle = this._options.color;
        ctx.font = `${12 * scope.verticalPixelRatio}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          this._options.label,
          scope.bitmapSize.width - 10 * scope.horizontalPixelRatio,
          scaledY
        );
      }
    });
  }
}

// VIEW - Manages coordinate conversion
class HorizLinePaneView implements ISeriesPrimitivePaneView {
  private _source: HorizontalLinePrimitive;
  private _y: Coordinate | null = null;

  constructor(source: HorizontalLinePrimitive) {
    this._source = source;
  }

  update(): void {
    const series = this._source._series;
    this._y = series.priceToCoordinate(this._source._options.price);
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    return new HorizLinePaneRenderer(this._y, this._source._options);
  }
}

// PRIMITIVE - Main class
export class HorizontalLinePrimitive implements ISeriesPrimitive {
  _chart: any;
  _series: any;
  _options: HorizontalLineOptions;
  private _paneViews: HorizLinePaneView[];
  private _requestUpdate?: () => void;

  constructor(options: Partial<HorizontalLineOptions> & { price: number }) {
    const defaultOptions: HorizontalLineOptions = {
      price: options.price,
      color: '#3179F5',
      width: 2,
      lineStyle: 0, // solid
    };
    this._options = { ...defaultOptions, ...options };

    this._paneViews = [new HorizLinePaneView(this)];
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
   * Update the line price level
   */
  updatePrice(price: number): void {
    this._options.price = price;
    this._requestUpdate?.();
  }

  /**
   * Update line appearance
   */
  updateOptions(options: Partial<HorizontalLineOptions>): void {
    this._options = { ...this._options, ...options };
    this._requestUpdate?.();
  }
}
