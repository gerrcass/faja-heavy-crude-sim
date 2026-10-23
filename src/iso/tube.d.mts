import type { Point3, Projection } from "./iso-kit";

export interface TubePiece {
  mid: Point3;
  body: string;
  shine: string;
  shade: string;
  edges: string;
  wide: boolean;
  points: Point3[];
  radii: number[];
  ends: [boolean, boolean];
  from: number;
  to: number;
  rings: Array<{ d: string; alpha: number }>;
  ringTone?: string;
}

export interface RingOptions {
  pitch?: number;
  twist?: number;
  cross?: boolean;
  fade?: [number, number];
  phase?: number;
  steps?: number;
  tone?: string;
}

export interface TubeOptions {
  maxLength?: number;
  spacing?: number;
  closed?: boolean;
  breaks?: number[];
  gaps?: Array<[number, number]>;
  caps?: boolean | [boolean, boolean];
  stripes?: boolean | "auto";
  rings?: RingOptions | null;
}

export function tubePieces(
  points3: Point3[],
  radius: number | ((t: number) => number),
  P: Projection,
  options?: TubeOptions,
): TubePiece[];
export function tubeSvg(piece: TubePiece, options?: { tone?: string }): string;
export function ringsSvg(rings: Array<{ d: string; alpha: number }>, tone?: string): string;
export function runsOf(total: number, gaps?: Array<[number, number]>): Array<[number, number]>;
export function crossingsOf(points: Point3[], centre: Point3, axis: Point3, radius: number): number[];
