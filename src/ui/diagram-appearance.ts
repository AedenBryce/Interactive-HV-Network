export type DiagramAppearance = { lineWidth: number; symbolScale: number; textScale?: number };
export const defaultDiagramAppearance: DiagramAppearance = { lineWidth: 1.4, symbolScale: 1 };

export function validateDiagramAppearance(value: unknown): DiagramAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid diagram appearance.');
  const { lineWidth, symbolScale, textScale } = value as Record<string, unknown>;
  if (typeof lineWidth !== 'number' || !Number.isFinite(lineWidth) || lineWidth < 1 || lineWidth > 5
    || typeof symbolScale !== 'number' || !Number.isFinite(symbolScale) || symbolScale < 1 || symbolScale > 4
    || textScale !== undefined && (typeof textScale !== 'number' || !Number.isFinite(textScale) || textScale < 1 || textScale > 3)) throw new Error('Diagram appearance is outside the supported range.');
  return { lineWidth, symbolScale, ...(textScale === undefined ? {} : { textScale: textScale as number }) };
}
