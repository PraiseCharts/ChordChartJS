export interface RadiusOpts { radius: number }
export interface FillOpts { fill?: boolean }
interface HeightOpts { height: number }
export interface PositionOpts { x: number, y: number }
export interface SizeOpts { size: number }
export interface ThicknessOpts { thickness: number }
interface WidthOpts { width: number }
export type DimensionOpts = WidthOpts & HeightOpts;

export interface Renderer {
  circle({
    x, y, size, fill, thickness,
  }: FillOpts & PositionOpts & SizeOpts & ThicknessOpts): void

  line({
    x1, y1, x2, y2, thickness,
  }: { x1: number, y1: number, x2: number, y2: number } & ThicknessOpts): void

  rect({
    x, y, width, height, fill, thickness, radius,
  }: DimensionOpts & FillOpts & PositionOpts & RadiusOpts & ThicknessOpts): void

  text(text: string, { fontSize, x, y } : { fontSize: number, x: number, y: number }): void;
}
