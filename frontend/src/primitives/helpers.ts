/**
 * Helper functions for TradingView lightweight-charts primitives
 */

/**
 * Position a line accounting for pixel ratio and width
 */
export function positionsLine(
  position: number,
  pixelRatio: number,
  desiredWidthMedia: number = 1
): { position: number; length: number } {
  const scaledPosition = Math.round(position * pixelRatio);
  const scaledWidth = Math.max(1, Math.floor(desiredWidthMedia * pixelRatio));
  const halfScaledWidth = Math.floor(scaledWidth / 2);

  return {
    position: scaledPosition - halfScaledWidth,
    length: scaledWidth,
  };
}

/**
 * Position a box (for rectangles) with proper pixel alignment
 */
export function positionsBox(
  position1: number,
  position2: number,
  pixelRatio: number
): { position: number; length: number } {
  const scaledPosition1 = Math.round(position1 * pixelRatio);
  const scaledPosition2 = Math.round(position2 * pixelRatio);

  return {
    position: Math.min(scaledPosition1, scaledPosition2),
    length: Math.abs(scaledPosition2 - scaledPosition1),
  };
}

/**
 * Set line style on canvas context
 */
export function setLineStyle(
  ctx: CanvasRenderingContext2D,
  style: number = 0 // 0 = solid, 1 = dotted, 2 = dashed, 3 = large dashed, 4 = sparse dotted
): void {
  switch (style) {
    case 1: // Dotted
      ctx.setLineDash([1, 1]);
      break;
    case 2: // Dashed
      ctx.setLineDash([4, 4]);
      break;
    case 3: // Large Dashed
      ctx.setLineDash([8, 8]);
      break;
    case 4: // Sparse Dotted
      ctx.setLineDash([1, 4]);
      break;
    default: // Solid
      ctx.setLineDash([]);
  }
}
