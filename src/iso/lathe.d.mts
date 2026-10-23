import type { Point3, Projection, SolidPaths } from "./iso-kit";

export interface Frame {
  o: Point3;
  a: Point3;
  u: Point3;
  v: Point3;
}

export type MeridianPoint = [number, number] | [number, number, number];
export type Meridian = MeridianPoint[];

export interface LatheOptions {
  steps?: number;
  fill?: "auto" | "surface" | "hull" | "facets";
  hole?: [number, number] | null;
  bevel?: number;
  rims?: "all" | "none" | "first" | "last" | "ends";
  smooth?: boolean | "auto" | { rows?: number; slope?: (s: number) => number; radius?: (s: number) => number };
  waist?: number;
}

export interface ArcOptions {
  slope?: number;
  steps?: number;
  least?: number;
  inward?: boolean;
  from?: number;
  to?: number;
  trim?: number;
}

export interface RibOptions {
  phase?: number;
  twist?: number;
  least?: number;
  r1?: number;
  fade?: [number, number] | null;
  seams?: boolean | "first" | "last";
}

export function dot3(a: Point3, b: Point3): number;
export function add3(a: Point3, b: Point3): Point3;
export function sub3(a: Point3, b: Point3): Point3;
export function mul3(a: Point3, k: number): Point3;
export function len3(a: Point3): number;
export function unit3(a: Point3): Point3;
export function cross3(a: Point3, b: Point3): Point3;
export function lerp3(a: Point3, b: Point3, t: number): Point3;
export function viewOf(P: Projection): Point3;
export function scaleOf(P: Projection): number;
export function frameAlong(o: Point3, a: Point3): Frame;
export function frameOf(o: Point3, a: Point3, u: Point3, v: Point3): Frame;
export function pointOf(F: Frame, s: number, r: number, angle: number): Point3;
export function solidOf(profile: Meridian, F: Frame, P: Projection, options?: LatheOptions): SolidPaths;
export function lathe(meridian: Meridian, F: Frame, P: Projection, options?: LatheOptions): SolidPaths;
export function disc(s0: number, s1: number, r: number, F: Frame, P: Projection, options?: LatheOptions): SolidPaths;
export function ringBand(s0: number, s1: number, rIn: number, rOut: number, F: Frame, P: Projection, options?: LatheOptions): SolidPaths;
export function sphereOf(centre: Point3, r: number, P: Projection, options?: { steps?: number }): SolidPaths;
export function arcOf(F: Frame, s: number, r: number, P: Projection, options?: ArcOptions): string;
export function circleOf(F: Frame, s: number, r: number, P: Projection, steps?: number): string;
export function dotsOf(
  F: Frame,
  s: number,
  r: number,
  count: number,
  P: Projection,
  options?: { phase?: number; slope?: number; least?: number; all?: boolean; fade?: [number, number] | null },
): Array<[number, number, number?]>;
export function ribsOf(
  F: Frame,
  s0: number,
  s1: number,
  r: number,
  count: number,
  P: Projection,
  options?: RibOptions,
): Array<{ d: string; alpha: number }> | string[];
export function spokesOf(
  F: Frame,
  s: number,
  r0: number,
  r1: number,
  count: number,
  P: Projection,
  options?: { phase?: number; sweep?: number; from?: number; to?: number },
): string;
export function fillet(points: Point3[], radius: number, perArc?: number, options?: { P?: Projection | null; tube?: number; margin?: number }): Point3[];
export function resample(points: Point3[], spacing: number): Point3[];
export function pathLength(points: Point3[]): number;
export function cut(points: Point3[], from: number, to: number): Point3[];
export function pointAlong(points: Point3[], at: number): Point3;
export function tangentAlong(points: Point3[], at: number): Point3;
export function spiral(F: Frame, s: number, r0: number, r1: number, a0: number, a1: number, steps?: number): Point3[];
export function arcPoints(F: Frame, s: number, r: number, a0: number, a1: number, steps?: number): Point3[];
