import * as k from "../iso/iso-kit";
import * as G from "../iso/lathe.mjs";
import { tubePieces, tubeSvg } from "../iso/tube.mjs";
import type { Point3 } from "../iso/iso-kit";

/**
 * The Hero cutaway: a bench model of a Faja production train, built from the
 * Anatomy kit. Solids carry mass; ladders, railings, seams and flow traces are
 * linework so the drawing stays legible at phone width. Geometry is generated
 * once at module load; the live layer only changes station classes.
 */

export const FIGURE_WIDTH = 1000;
export const FIGURE_HEIGHT = 650;

const PLATE = { x: -194, y: -108, w: 388, d: 222, r: 14 };

const FIT_POINTS: Point3[] = [
  ...k.boxCorners(PLATE, -20, 0),
  [-194, 114, 0],
  [194, 114, 0],
  [0, -108, 0],
  [-60, -90, 72],
  [156, -82, 100],
  [186, -90, 96],
  [56, -50, 66],
  [128, 70, 48],
];

const P = k.fitProjection(FIT_POINTS, FIGURE_WIDTH, FIGURE_HEIGHT, { pad: 24, azimuth: 45, elevation: 33 });
const V = G.viewOf(P);

type Style = Parameters<typeof k.solidSvg>[1];

const S = (paths: Parameters<typeof k.solidSvg>[0], style: Style = {}) => k.solidSvg(paths, style);
const L = (d: string, style: Parameters<typeof k.lineSvg>[1] = {}) => k.lineSvg(d, style);
const D = (points: Array<[number, number] | [number, number, number?]>, style: Parameters<typeof k.dotsSvg>[1] = {}) =>
  k.dotsSvg(
    points.map((point): k.Flat | [number, number, number] =>
      point.length === 3 ? [point[0], point[1], point[2] ?? 1] : [point[0], point[1]],
    ),
    style,
  );
const at = (point: Point3) => k.iso(point, P);

const byDepth = (points: k.Plane[]) =>
  [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

const accent = (inner: string) => `<g class="st-accent">${inner}</g>`;
const body = (inner: string) => `<g class="st-body">${inner}</g>`;

const frame = (origin: Point3, axis: Point3) => G.frameAlong(origin, axis);

function turned(
  profile: Array<[number, number] | [number, number, number]>,
  origin: Point3,
  axis: Point3,
  style: Style = {},
  options: Parameters<typeof G.solidOf>[3] = {},
) {
  return S(G.solidOf(profile, frame(origin, axis), P, options), style);
}

function pipe(
  points: Point3[],
  radius: number,
  options: { tone?: k.LineTone; maxLength?: number; gaps?: Array<[number, number]> } = {},
) {
  const path = G.fillet(points, Math.max(1.4, radius * 2.6), 6, { P, tube: radius });
  const pieces = tubePieces(path, radius, P, {
    maxLength: options.maxLength ?? 24,
    spacing: 1.5,
    gaps: options.gaps,
  });
  pieces.sort((a, b) => G.dot3(a.mid, V) - G.dot3(b.mid, V));
  return pieces.map((piece) => tubeSvg(piece, { tone: options.tone ?? "mid" })).join("");
}

function flow(points: Point3[], tone: k.LineTone, className: string) {
  const d = k.pathOf(points.map((point) => at(point)));
  const ends = [points[0], points[points.length - 1]];
  return `${L(d, { tone, flow: true, className: `flow-line ${className}` })}${D(ends.map((point) => at(point)), { size: 1.1, tone: "mid" })}`;
}

function flange(origin: Point3, axis: Point3, atS: number, radius: number, style: Style = { tone: "mid" }) {
  const F = frame(origin, axis);
  return `${S(G.disc(atS - 1.1, atS, radius, F, P), style)}${D(G.dotsOf(F, atS, radius * 0.68, 6, P, { all: true }), { size: 0.36, tone: "mid" })}`;
}

function handwheel(x: number, y: number, z: number, radius: number) {
  return `${S(k.cylinder(x, y, radius, z, 1.1, P, 24), { tone: "mid" })}${L(k.ring(x, y, radius, z + 1.1, P, 28), { tone: "lo" })}${L(k.ring(x, y, radius * 0.28, z + 1.1, P, 14), { tone: "lo" })}${D([[x, y, z + 1.2]], { size: 0.45, tone: "mid" })}`;
}

function gauge(x: number, y: number, z: number, radius: number) {
  const F = frame([x, y, z], [0, 1, 0]);
  const disc = G.disc(0, 1, radius, F, P);
  const bezel = G.circleOf(F, 1, radius * 0.78, P);
  const needle = k.pathOf([
    at([x, y + 1.1, z]),
    at([x + radius * 0.6, y + 1.1, z + radius * 0.45]),
  ]);
  return `${S(disc, { tone: "hi" })}${L(bezel, { tone: "lo" })}${L(needle, { tone: "hi" })}${D([[x, y + 1.1, z]], { size: 0.55, tone: "mid" })}`;
}

function valve(x: number, y: number, z: number, axis: Point3, size = 1) {
  const F = frame([x, y, z], axis);
  const shape = G.solidOf(
    [
      [-5 * size, 0.01],
      [-4 * size, 2.2 * size],
      [-1.8 * size, 3.1 * size, 1],
      [1.8 * size, 3.1 * size, 1],
      [4 * size, 2.2 * size],
      [5 * size, 0.01],
    ],
    F,
    P,
  );
  return `${S(shape, { tone: "hi" })}${S(k.cylinder(x, y, 1.05 * size, z + 2.6 * size, 2.8 * size, P, 12), { tone: "mid" })}${handwheel(x, y, z + 5.4 * size, 3.2 * size)}`;
}

/** Ladders and railings are thin tubes, so every end is capped and drawn. */
function ladder(x: number, y: number, z0: number, z1: number, width = 5) {
  const height = z1 - z0;
  const count = Math.max(3, Math.round(height / 5));
  const out: string[] = [];
  for (const side of [-1, 1]) {
    out.push(pipe([[x + side * (width / 2), y, z0], [x + side * (width / 2), y, z1]], 0.32, { tone: "lo", maxLength: 14 }));
  }
  for (let index = 0; index < count; index++) {
    const z = z0 + (height * (index + 0.5)) / count;
    out.push(pipe([[x - width / 2, y, z], [x + width / 2, y, z]], 0.24, { tone: "lo", maxLength: 8 }));
  }
  return out.join("");
}

function railing(points: k.Plane[], z: number, height = 6) {
  const out: string[] = [];
  for (const [x, y] of points) {
    out.push(pipe([[x, y, z], [x, y, z + height]], 0.3, { tone: "lo", maxLength: 8 }));
  }
  const top = points.map(([x, y]) => [x, y, z + height] as Point3);
  const mid = points.map(([x, y]) => [x, y, z + height - 2.4] as Point3);
  out.push(pipe([...top, top[0]], 0.28, { tone: "lo", maxLength: 14 }));
  out.push(pipe([...mid, mid[0]], 0.22, { tone: "faint", maxLength: 14 }));
  return out.join("");
}

function grate(plan: { x: number; y: number; w: number; d: number; r: number }, z: number, count = 5) {
  return Array.from({ length: count - 1 }, (_, index) => {
    const x = plan.x + (plan.w * (index + 1)) / count;
    return L(k.segment([x, plan.y, z], [x, plan.y + plan.d, z], P), { tone: "faint" });
  }).join("");
}

// ---------------------------------------------------------------------------
// Base plate
// ---------------------------------------------------------------------------

function basePlate(): string {
  const out: string[] = [`<path class="iso-halo" d="${k.haloOf(PLATE, -20, 12, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7.4, -20, 8, P, 28, 0.8), { tone: "mid" }));
    out.push(L(k.ring(x, y, 7.4, -12, P, 28), { tone: "lo" }));
    out.push(D([[x, y, -12]], { size: 0.5, tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -12, 12, P, 10, 1.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P, 10), { tone: "lo" }));
  const screws = k.corners(PLATE, 12);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.6, 0, P, 18)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => [x, y, 0]), { size: 0.52, tone: "mid" }));

  // A ruler strip rooted on the plate's near edge.
  const strip = { x: -168, y: 108, w: 336, d: 5.5, r: 0.8 };
  out.push(S(k.slabOf(strip, 0, 0.5, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.5, 0.5, [1.3, 3.2], P);
  out.push(L(ticks.minor, { tone: "lo" }));
  out.push(L(ticks.major, { tone: "mid" }));

  // Label plate: the three rules stand for printed text and are free at their ends by design.
  const label = { x: -186, y: 96, w: 68, d: 9, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 4), { tone: "faint" }));
  const rules = [36, 48, 27]
    .map((width, index) => k.lineOnTop([label.x + 4, label.y + 2.4 + index * 2.2], [label.x + 4 + width, label.y + 2.4 + index * 2.2], 0.8, P))
    .join("");
  out.push(L(rules, { tone: "lo", free: true }));

  // A shallow seat under the reservoir block.
  out.push(S(k.slabOf({ x: -188, y: -100, w: 126, d: 116, r: 4 }, 0, 0.45, P, 4), { tone: "faint", crease: "none" }));
  return out.join("");
}

// ---------------------------------------------------------------------------
// 01 Reservoir
// ---------------------------------------------------------------------------

const RES = { x: -184, y: -94, w: 116, d: 98, r: 3 };
const RES_TOP = 50;
const CUT_Z = 24;
const BENCH_Y = -34;

function reservoir(): string {
  const out: string[] = [];
  const x0 = RES.x;
  const x1 = RES.x + RES.w;
  const y0 = RES.y;
  const y1 = RES.y + RES.d;

  // The lower block is whole; the upper strata are cut back to a bench, so the
  // long face at y = BENCH_Y reads as a quarry wall rather than a building.
  out.push(S(k.slabOf(RES, 0, 12, P, 6, 0.6), { tone: "lo", className: "strata strata-deep" }));
  out.push(S(k.slabOf(RES, 12, CUT_Z - 12, P, 6, 0.5), { tone: "mid", className: "strata strata-pay" }));
  out.push(S(k.slabOf({ x: x0, y: y0, w: RES.w, d: BENCH_Y - y0, r: 3 }, 12, 1, P, 6), { tone: "lo", className: "strata strata-shale" }));

  const upper: Array<[number, number, string]> = [
    [CUT_Z, 10, "strata-sand"],
    [CUT_Z + 10, 1.8, "strata-shale"],
    [CUT_Z + 11.8, 8.8, "strata-silt"],
    [CUT_Z + 20.6, 1.8, "strata-shale"],
    [RES_TOP - 3.6, 3.6, "strata-cap"],
  ];
  for (const [z, height, cls] of upper) {
    const solid = k.slabOf({ x: x0, y: y0, w: RES.w, d: BENCH_Y - y0, r: 3 }, z, height, P, 6, 0.5);
    out.push(S(solid, { tone: "lo", className: cls, inner: L(k.sideSeam({ x: x0, y: y0, w: RES.w, d: BENCH_Y - y0, r: 3 }, z + height, P, 6), { tone: "faint" }) }));
  }

  // The bench is the top of the pay. Stipple it and run two horizontal wells along it.
  const bench = { x: x0 + 6, y: BENCH_Y + 4, w: RES.w - 12, d: y1 - BENCH_Y - 10 };
  out.push(D(k.dotGrid(bench.x, bench.y, 8, 4, 7, CUT_Z + 0.15, P), { size: 0.32, tone: "lo" }));
  for (const y of [BENCH_Y + 13, BENCH_Y + 23]) {
    const route: Point3[] = [
      [x0 + 5, y, CUT_Z + 2.1],
      [x1 - 5, y, CUT_Z + 2.1],
    ];
    out.push(
      accent(
        `${pipe(route, 1.75, { tone: "mid", maxLength: 20 })}${flange([x1 - 5, y, CUT_Z + 2.1], [1, 0, 0], 0, 2.7)}${flange([x0 + 5, y, CUT_Z + 2.1], [-1, 0, 0], 0, 2.7)}`,
      ),
    );
  }

  // A few core holes on the cut face mark the pay contact.
  out.push(D([[-166, BENCH_Y, 20], [-150, BENCH_Y, 20], [-134, BENCH_Y, 20], [-118, BENCH_Y, 20], [-102, BENCH_Y, 20], [-86, BENCH_Y, 20]], { size: 0.4, tone: "mid" }));

  // Cap detail: survey lines, a marker and a line-only mast.
  out.push(L(k.planOutline({ x: x0 + 12, y: y0 + 12, w: RES.w - 24, d: BENCH_Y - y0 - 24, r: 10 }, RES_TOP, P, 10), { tone: "faint" }));
  out.push(L(k.planOutline({ x: x0 + 30, y: y0 + 26, w: RES.w - 60, d: BENCH_Y - y0 - 40, r: 8 }, RES_TOP, P, 10), { tone: "faint" }));
  out.push(D([[-156, -80, RES_TOP], [-142, -68, RES_TOP], [-96, -84, RES_TOP], [-82, -60, RES_TOP], [-166, -52, RES_TOP]], { size: 0.34, tone: "lo" }));
  const mast = [-116, -74] as k.Plane;
  for (const offset of [[-4, -4], [4, -4], [0, 4]] as k.Plane[]) {
    out.push(pipe([[mast[0] + offset[0], mast[1] + offset[1], RES_TOP], [mast[0], mast[1], RES_TOP + 20]], 0.32, { tone: "lo", maxLength: 12 }));
  }
  out.push(D([[mast[0], mast[1], RES_TOP + 20]], { size: 0.55, tone: "mid" }));
  out.push(pipe([[mast[0], mast[1], RES_TOP + 20], [mast[0] + 6, mast[1] + 6, RES_TOP + 2]], 0.2, { tone: "faint", maxLength: 10 }));

  // Core-sample tray on the bench.
  const tray = { x: -190, y: 4, w: 24, d: 17, r: 1.4 };
  out.push(S(k.slabOf(tray, 0, 1.5, P, 3, 0.3), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(tray, 1.4), 1.5, P, 3), { tone: "faint" }));
  for (let index = 0; index < 3; index++) {
    const y = tray.y + 3.6 + index * 5;
    const cls = index === 1 ? "strata-shale" : index === 2 ? "strata-pay" : "strata-over";
    out.push(S(G.disc(0, 12, 2.1, frame([tray.x + 3, y, 3.3], [1, 0, 0]), P), { tone: "mid", className: cls }));
  }
  out.push(D([[tray.x + 16, tray.y + 8, 2.2]], { size: 0.45, tone: "mid" }));
  return out.join("");
}

// ---------------------------------------------------------------------------
// 02 Well pad
// ---------------------------------------------------------------------------

function wellhead(x: number, y: number, height: number, accentTree = false) {
  const out: string[] = [];
  const profile: Array<[number, number] | [number, number, number]> = [
    [0, 5.6],
    [1.2, 5.6],
    [1.2, 3.8],
    [6.8, 3.8],
    [6.8, 4.9, 1],
    [8.6, 4.9],
    [8.6, 3.6],
    [height - 3.2, 3.6],
    [height - 3.2, 4.7, 1],
    [height - 1.2, 4.7],
    [height - 1.2, 2.7],
    [height + 0.8, 2.7],
    [height + 2.2, 1.8],
    [height + 2.8, 0.01],
  ];
  const tree = turned(profile, [x, y, 0], [0, 0, 1], { tone: "hi", className: "metal" });
  // The stem is drawn under the tree and the handwheel so both of its ends are covered by them.
  out.push(S(k.cylinder(x + 5.6, y, 0.55, height - 6, 6.2, P, 10), { tone: "mid" }));
  out.push(accentTree ? accent(tree) : tree);
  out.push(handwheel(x + 5.6, y, height + 0.2, 2.8));
  out.push(pipe([[x + 2.6, y, height - 10], [x + 12, y, height - 10], [x + 12, y + 12, 11]], 1.15, { tone: "mid", maxLength: 14 }));
  return out.join("");
}

function pcpDriveHead(x: number, y: number) {
  const out: string[] = [];
  out.push(S(k.slabOf({ x: x - 8, y: y - 6, w: 16, d: 12, r: 1 }, 0, 2, P, 4, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x - 6.5, y: y - 5, w: 2.4, d: 10, r: 0.5 }, 2, 16, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + 4.1, y: y - 5, w: 2.4, d: 10, r: 0.5 }, 2, 16, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 5, y: y - 4, w: 10, d: 8, r: 1 }, 17, 2.4, P, 4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 4, y: y - 3.4, w: 8, d: 6.8, r: 0.8 }, 19.4, 5, P, 4, 0.4), { tone: "hi", className: "metal" }));
  out.push(turned([[0, 0.01], [0.8, 3.2], [2, 4.3], [10, 4.3], [11.4, 3.2], [12, 0.01]], [x + 1, y, 24.4], [1, 0, 0], { tone: "hi", className: "metal" }));
  const sheave = G.disc(0, 1.3, 6.3, frame([x - 6, y, 23], [1, 0, 0]), P);
  out.push(accent(`${S(sheave, { tone: "hi" })}${L(k.ring(x - 4.7, y, 4.9, 23.6, P, 26), { tone: "lo" })}${S(k.cylinder(x - 5.2, y, 1.7, 24.3, 1.1, P, 12), { tone: "mid" })}`));
  out.push(pipe([[x - 6, y - 5.7, 23], [x - 6, y - 5.7, 16], [x - 5.2, y - 3.1, 12]], 0.42, { tone: "mid", maxLength: 10 }));
  out.push(pipe([[x - 6, y + 5.7, 23], [x - 6, y + 5.7, 16], [x - 5.2, y + 3.1, 12]], 0.42, { tone: "mid", maxLength: 10 }));
  out.push(S(k.cylinder(x - 5.2, y, 4.1, 0, 5.6, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(x - 5.2, y, 3.6, 5.6, 4, P, 20, 0.4), { tone: "hi" }));
  out.push(S(k.cylinder(x - 5.2, y, 1, 9.6, 2.8, P, 10), { tone: "hi" }));
  return out.join("");
}

function wellPad(): string {
  const out: string[] = [];
  const pad = { x: -180, y: 28, w: 132, d: 68, r: 4 };
  out.push(S(k.slabOf(pad, 0, 4, P, 8, 0.7), { tone: "lo", className: "concrete" }));
  out.push(L(k.planOutline(k.insetPlan(pad, 4), 4, P, 8), { tone: "faint" }));
  const gratePlan = { x: -148, y: 82, w: 22, d: 8, r: 1 };
  out.push(L(k.planOutline(gratePlan, 4, P, 3), { tone: "mid" }));
  for (let index = 0; index < 4; index++) {
    out.push(L(k.planOutline({ x: gratePlan.x + 2 + index * 4.8, y: gratePlan.y + 2, w: 1.5, d: 4, r: 0.6 }, 4, P, 3), { tone: "lo" }));
  }
  out.push(D(k.corners(pad, 6).map(([x, y]) => [x, y, 4]), { size: 0.45, tone: "mid" }));

  out.push(wellhead(-162, 52, 25, false));
  out.push(wellhead(-134, 52, 22, false));
  out.push(pcpDriveHead(-96, 56));

  // Flowline header and branches.
  out.push(pipe([[-176, 84, 8], [-58, 84, 8]], 1.45, { tone: "mid", maxLength: 20 }));
  out.push(pipe([[-162, 52, 15], [-162, 84, 8]], 1.15, { tone: "mid", maxLength: 14 }));
  out.push(pipe([[-134, 52, 15], [-134, 84, 8]], 1.15, { tone: "mid", maxLength: 14 }));
  out.push(valve(-108, 84, 8, [1, 0, 0], 0.8));
  
  out.push(pipe([[-58, 84, 8], [-48, 84, 8], [-48, 74, 18], [-24, 74, 18], [-24, 62, 26], [-2, 60, 34], [20, 56, 42], [30, 52, 46]], 1.45, { tone: "mid", maxLength: 18 }));

  // Steam manifold.
  out.push(pipe([[-150, 30, 9], [-60, 30, 9]], 1.55, { tone: "mid", maxLength: 22 }));
  out.push(pipe([[-150, 30, 9], [-150, 44, 9], [-162, 44, 13]], 0.65, { tone: "lo", maxLength: 12 }));
  out.push(pipe([[-128, 30, 9], [-128, 44, 9], [-134, 44, 13]], 0.65, { tone: "lo", maxLength: 12 }));
  out.push(valve(-112, 30, 9, [1, 0, 0], 0.75));

  // Instrument cabinet.
  out.push(S(k.slabOf({ x: -68, y: 34, w: 8, d: 5, r: 0.8 }, 4, 11, P, 4, 0.4), { tone: "mid" }));
  
  return out.join("");
}

// ---------------------------------------------------------------------------
// 03 Steam
// ---------------------------------------------------------------------------

function steamGenerator(): string {
  const out: string[] = [];
  const x0 = -4;
  const x1 = 62;
  const y = -44;
  const zc = 28;
  const r = 11;

  out.push(S(k.slabOf({ x: x0 - 4, y: y - 22, w: x1 - x0 + 8, d: 4, r: 0.8 }, 0, 3, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x0 - 4, y: y + 18, w: x1 - x0 + 8, d: 4, r: 0.8 }, 0, 3, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x0 - 4, y: y - 22, w: 3, d: 44, r: 0.6 }, 0, 2.4, P, 3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: x1 + 1, y: y - 22, w: 3, d: 44, r: 0.6 }, 0, 2.4, P, 3), { tone: "lo" }));
  for (const [x, yy] of [[x0 + 1, y - 20], [x1, y + 18]] as Array<[number, number]>) {
    out.push(S(k.cylinder(x, yy, 2.6, -0.6, 2.2, P, 14), { tone: "mid" }));
  }

  const vesselLength = x1 - x0;
  const profile: Array<[number, number] | [number, number, number]> = [
    [0, 0.01],
    [1.2, 6.2, 1],
    [4, 9.8, 1],
    [7, r],
    [vesselLength - 7, r],
    [vesselLength - 4, 9.8, 1],
    [vesselLength - 1.2, 6.2, 1],
    [vesselLength, 0.01],
  ];
  const F = frame([x0, y, zc], [1, 0, 0]);
  const bands = [21, 45].map((s) => L(G.arcOf(F, s, r, P), { tone: "faint" })).join("");
  out.push(body(S(G.solidOf(profile, F, P), { tone: "hi", className: "metal", halo: true, inner: bands })));
  out.push(S(k.slabOf({ x: x0 + 8, y: y - 8, w: 10, d: 16, r: 1.4 }, 0, 17, P, 4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x1 - 18, y: y - 8, w: 10, d: 16, r: 1.4 }, 0, 17, P, 4), { tone: "mid" }));

  out.push(S(k.cylinder(54, y, 3.4, 38, 26, P, 26), { tone: "mid" }));
  out.push(S(k.cylinder(54, y, 4.4, 64, 2, P, 26), { tone: "hi" }));
  out.push(turned([[0, 0.01], [0.8, 4.2], [3.6, 5.8], [6, 5.8], [7, 4.2], [7.4, 0.01]], [x0 - 6, y, zc], [1, 0, 0], { tone: "hi" }));
  out.push(S(G.disc(0, 3.6, 6.8, frame([x0 - 11, y, zc], [1, 0, 0]), P), { tone: "mid" }));
  out.push(accent(gauge(x0 - 10, y + 6.8, zc + 1, 2.1)));
  out.push(S(k.slabOf({ x: 6, y: y + 20, w: 18, d: 5, r: 0.8 }, 2, 13, P, 4, 0.3), { tone: "mid" }));
  out.push(gauge(14, y + 25, 11, 2.1));
  out.push(S(k.cylinder(36, y + 20, 2.4, 2, 6, P, 16), { tone: "mid" }));
  
  out.push(pipe([[46, y + 20, 6], [52, y + 20, 6], [52, y + 12, 20], [52, y, 34]], 0.6, { tone: "lo", maxLength: 12 }));

  // Steam outlet down the front of the machine and along the bench to the pad.
  out.push(pipe([[36, y, 39], [36, y, 50], [36, 16, 50], [36, 24, 30], [20, 24, 14], [-40, 24, 14], [-100, 24, 14], [-150, 30, 12]], 1.35, { tone: "mid", maxLength: 26 }));
  out.push(valve(-70, 24, 14, [1, 0, 0], 0.85));
  out.push(ladder(58, y + 2, 7, 30, 4.5));
  return out.join("");
}

// ---------------------------------------------------------------------------
// 04 Separation
// ---------------------------------------------------------------------------

function separator(): string {
  const out: string[] = [];
  const x0 = 14;
  const x1 = 96;
  const y = 52;
  const zc = 30;
  const r = 14;

  out.push(S(k.slabOf({ x: 24, y: 32, w: 12, d: 40, r: 1.2 }, 0, 14, P, 4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 78, y: 32, w: 12, d: 40, r: 1.2 }, 0, 14, P, 4), { tone: "mid" }));
  const vesselLength = x1 - x0;
  const profile: Array<[number, number] | [number, number, number]> = [
    [0, 0.01],
    [1.6, 7.2, 1],
    [5, 12.4, 1],
    [8.4, r],
    [vesselLength - 8.4, r],
    [vesselLength - 5, 12.4, 1],
    [vesselLength - 1.6, 7.2, 1],
    [vesselLength, 0.01],
  ];
  const F = frame([x0, y, zc], [1, 0, 0]);
  const bands = [21, 43, 61].map((s) => L(G.arcOf(F, s, r, P), { tone: "faint" })).join("");
  out.push(body(S(G.solidOf(profile, F, P), { tone: "hi", className: "metal", halo: true, inner: bands })));

  // Nozzles: inlet, gas, oil and water.
  out.push(S(k.cylinder(30, y, 3.2, zc + 10, 6, P, 18), { tone: "hi" }));
  
  out.push(S(k.cylinder(82, y, 2.6, zc + 11, 7, P, 18), { tone: "hi" }));
  out.push(flange([82, y, zc + 18], [0, 0, 1], 0, 3.4));
  out.push(S(k.cylinder(86, y, 3, 13, 8, P, 18), { tone: "hi" }));

  // Sand knock-out and water boot.
  out.push(turned([[0, 0.01], [1, 3], [5, 4.4], [11, 7.4], [11.8, 7.8]], [48, y, 2], [0, 0, 1], { tone: "mid" }));
  out.push(valve(48, y, 15, [0, 0, 1], 0.7));
    out.push(accent(`${S(k.cylinder(36.8, y, 0.62, 5, 8, P, 10), { tone: "hi" })}${S(k.cylinder(36.8, y, 0.38, 5.3, 5, P, 8), { tone: "lo" })}`));
  out.push(S(k.cylinder(36.8, y, 0.9, 4.1, 1, P, 12), { tone: "mid" }));
  out.push(S(k.cylinder(36.8, y, 0.9, 13, 1, P, 12), { tone: "mid" }));

  // Gas scrubber and the fuel line back to the generator.
  out.push(S(k.cylinder(90, 28, 4, 44, 17, P, 22), { tone: "hi", className: "metal", halo: true }));
  
  out.push(pipe([[90, 28, 50], [98, 20, 50], [104, 8, 42], [80, -6, 32], [56, -20, 24], [30, -32, 20], [4, -40, 24], [-8, -44, 26]], 1.15, { tone: "mid", maxLength: 24 }));

  // Instrument panel and top platform.
  out.push(S(k.slabOf({ x: 58, y: 78, w: 18, d: 6, r: 1 }, 4, 12, P, 4, 0.4), { tone: "mid" }));
  
  out.push(railing([[40, 34], [70, 34], [70, 56]], 42, 4));
  out.push(ladder(74, 34, 4, 42, 4));

  // Sight glasses on the near face.
  for (const x of [62]) {
    out.push(accent(`${S(k.cylinder(x, 66.2, 0.7, 22, 15, P, 10), { tone: "hi" })}${S(k.cylinder(x, 66.2, 0.46, 22.4, 8, P, 8), { tone: "lo" })}`));
    out.push(S(k.cylinder(x, 66.2, 1.05, 20.8, 1.2, P, 12), { tone: "mid" }));
    out.push(S(k.cylinder(x, 66.2, 1.05, 37, 1.2, P, 12), { tone: "mid" }));
  }
  out.push(D([[61, 66.2, 20]], { size: 0.35, tone: "mid" }));

  out.push(waterSkid());
  return out.join("");
}

// ---------------------------------------------------------------------------
// 05 Blend
// ---------------------------------------------------------------------------

function blendStation(): string {
  const out: string[] = [];
  const cx = 126;
  const cy = 70;

  out.push(S(k.cylinder(cx, cy, 10.4, 0, 7, P, 30), { tone: "mid" }));
  const profile: Array<[number, number] | [number, number, number]> = [
    [0, 0.01],
    [0.8, 8, 1],
    [2.4, 11, 1],
    [5, 12],
    [33, 12],
    [36.5, 10, 1],
    [39.5, 6, 1],
    [41, 0.01],
  ];
  const F = frame([cx, cy, 6], [0, 0, 1]);
  const bands = [14, 25, 35].map((s) => L(G.arcOf(F, s, 12, P), { tone: "faint" })).join("");
  out.push(body(S(G.solidOf(profile, F, P), { tone: "hi", className: "metal", halo: true, inner: bands })));
  
  out.push(accent(`${S(k.cylinder(cx + 11.6, cy + 5, 0.7, 9, 28, P, 10), { tone: "hi" })}${S(k.cylinder(cx + 11.6, cy + 5, 0.44, 9.4, 16.6, P, 8), { tone: "lo" })}`));
  
  out.push(railing([[cx - 8, cy + 11], [cx + 8, cy + 11]], 40.8, 3));
  out.push(ladder(cx + 2, cy + 12.2, 7, 40, 4.2));

  // Produced oil arrives from the separator; diluent arrives from the tank.
  out.push(pipe([[86, 52, 13], [104, 58, 13], [124, 60, 13], [146, 58, 13]], 1.3, { tone: "mid", maxLength: 18 }));
  out.push(pipe([[cx + 6, cy + 10, 10], [cx + 6, cy + 18, 9], [144, 82, 9], [146, 58, 13]], 1.4, { tone: "mid", maxLength: 16 }));
  out.push(valve(146, 72, 10, [0, 0, 1], 0.75));

  // Open static mixer: a U-trough with three helical elements.
  const mx0 = 152;
  const mx1 = 182;
  const my = 48;
  const mz = 14;
  out.push(S(k.slabOf({ x: mx0, y: my - 6, w: mx1 - mx0, d: 12, r: 0.8 }, mz - 4, 2.6, P, 3, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x: mx0, y: my - 6, w: mx1 - mx0, d: 1.8, r: 0.4 }, mz - 1.4, 8, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: mx0, y: my + 4.2, w: mx1 - mx0, d: 1.8, r: 0.4 }, mz - 1.4, 8, P, 3), { tone: "mid" }));
  const elements: string[] = [];
  for (let index = 0; index < 3; index++) {
    const from = mx0 + 3 + index * 9;
    const points = G.spiral(frame([from, my, mz + 2], [1, 0, 0]), 0, 0, 3.2, index % 2 === 0 ? 0 : Math.PI, Math.PI * 2.3, 20);
    elements.push(pipe(points, 0.5, { tone: "mid", maxLength: 10 }));
  }
  out.push(accent(elements.join("")));
  out.push(flange([mx0, my, mz + 2], [-1, 0, 0], 0, 4.6));
  

  out.push(S(k.cylinder(112, 92, 4, 0, 10, P, 20), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 116, y: 88, w: 8, d: 6, r: 0.8 }, 0, 2, P, 3), { tone: "lo" }));
  
  out.push(turned([[0, 0.01], [0.6, 2.2], [2, 3], [5, 3], [5.8, 0.01]], [184, my, mz + 2], [1, 0, 0], { tone: "mid" }));
  
  out.push(pipe([[188, my, mz + 2], [190, my, mz + 2], [190, 30, mz + 2], [182, 18, 18], [168, 8, 26], [160, 2, 30]], 1.6, { tone: "mid", maxLength: 18 }));
  return out.join("");
}

// ---------------------------------------------------------------------------
// 06 Upgrade
// ---------------------------------------------------------------------------

function upgradeModule(): string {
  const out: string[] = [];
  const deck = { x: 78, y: -94, w: 110, d: 102, r: 3 };
  out.push(S(k.slabOf(deck, 0, 4, P, 6, 0.6), { tone: "lo", className: "concrete" }));
  out.push(grate(deck, 4, 6));
  out.push(L(k.planOutline(k.insetPlan(deck, 3), 4, P, 6), { tone: "faint" }));

  // A portal frame: back posts and beams first, equipment inside, front posts last.
  for (const [x, y] of [[84, -90], [182, -90]] as Array<[number, number]>) {
    out.push(S(k.slabOf({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.4 }, 4, 58, P, 3), { tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: 82, y: -92, w: 102, d: 2.8, r: 0.5 }, 58, 2.8, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 82, y: 0.2, w: 102, d: 2.8, r: 0.5 }, 58, 2.8, P, 3), { tone: "mid" }));
  out.push(pipe([[84, 2, 4], [84, 2, 58]], 0.45, { tone: "mid", maxLength: 18 }));
  out.push(pipe([[182, 2, 4], [182, 2, 58]], 0.45, { tone: "mid", maxLength: 18 }));

  // Coker furnace.
  out.push(S(k.slabOf({ x: 90, y: -86, w: 24, d: 18, r: 1.6 }, 4, 26, P, 5, 0.7), { tone: "mid" }));
  out.push(S(k.cylinder(102, -77, 3.2, 30, 26, P, 22), { tone: "mid" }));
  out.push(S(k.cylinder(102, -77, 4, 56, 1.5, P, 22), { tone: "hi" }));
  
  
  

  const column = (x: number, y: number, rr: number, top: number) => {
    const out2: string[] = [];
    out2.push(S(k.cylinder(x, y, rr + 1.2, 4, 3, P, 26), { tone: "mid" }));
    out2.push(S(G.solidOf([
      [0, 0.01],
      [1.6, rr * 0.6, 1],
      [4, rr * 0.92, 1],
      [8, rr],
      [top - 8, rr],
      [top - 4, rr * 0.92, 1],
      [top - 1.6, rr * 0.6, 1],
      [top, 0.01],
    ], frame([x, y, 7], [0, 0, 1]), P), { tone: "hi", className: "metal", halo: true, inner: [24, 46, 68, 88].map((s) => L(G.arcOf(frame([x, y, 7], [0, 0, 1]), s, rr, P), { tone: "faint" })).join("") }));
    out2.push(S(k.cylinder(x, y, rr * 0.55, top + 7, 2, P, 16), { tone: "mid" }));
    out2.push(ladder(x + rr + 1.4, y, 8, top + 4, 4));
    return out2.join("");
  };
  out.push(column(154, -80, 7, 94));
  out.push(column(174, -58, 6, 82));
  out.push(pipe([[154, -80, 101], [154, -80, 106], [168, -72, 106], [174, -58, 88]], 0.65, { tone: "mid", maxLength: 16 }));

  const drum = (x: number, y: number) => {
    const out2: string[] = [];
    out2.push(S(k.cylinder(x, y, 9, 4, 7, P, 26), { tone: "lo" }));
    const Fd = frame([x, y, 11], [0, 0, 1]);
    out2.push(accent(S(G.solidOf([
      [0, 0.01],
      [1.2, 6.2, 1],
      [4, 8.6, 1],
      [7, 9],
      [41, 9],
      [43.4, 8.2, 1],
      [46, 4.6, 1],
      [47, 0.01],
    ], Fd, P), { tone: "hi", className: "metal", halo: true, inner: [18, 30, 40].map((s) => L(G.arcOf(Fd, s, 9, P), { tone: "faint" })).join("") })));
    
    out2.push(ladder(x + 10.4, y, 12, 54, 4));
    return out2.join("");
  };
  out.push(drum(124, -70));
  out.push(drum(124, -42));

  // Hydrotreater reactor.
  const rF = frame([146, -16, 4], [0, 0, 1]);
  out.push(S(k.cylinder(146, -16, 8.4, 4, 3, P, 26), { tone: "mid" }));
  out.push(S(G.solidOf([
    [0, 0.01],
    [1.2, 4.2, 1],
    [4, 6.6, 1],
    [8, 7.2],
    [44, 7.2],
    [47, 6, 1],
    [50, 0.01],
  ], rF, P), { tone: "hi", className: "metal", halo: true, inner: L(G.arcOf(rF, 26, 7.2, P), { tone: "faint" }) }));
  
  out.push(ladder(155, -16, 8, 48, 4));

  // Product bullet.
  out.push(turned([[0, 0.01], [0.8, 3], [2, 5.4], [4, 5.8], [16, 5.8], [17.8, 4.6], [18.4, 0.01]], [160, 2, 14], [1, 0, 0], { tone: "hi", className: "metal", halo: true }));
  out.push(S(k.slabOf({ x: 164, y: -2, w: 4, d: 10, r: 0.8 }, 4, 9, P, 3), { tone: "mid" }));
  

  // Flare stack with guy wires.
  out.push(S(k.cylinder(186, -88, 2, 4, 84, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(186, -88, 2.7, 88, 2.2, P, 18), { tone: "hi" }));
  for (const [x, y] of [[180, -82], [192, -82], [186, -76]] as Array<[number, number]>) {
    out.push(pipe([[x, y, 4], [x, y, 20], [186, -88, 50]], 0.26, { tone: "lo", maxLength: 16 }));
  }

  // Front platform and pipe rack.
  out.push(railing([[88, -22], [110, -22], [110, 2]], 31, 4));
  out.push(ladder(114, 2, 4, 32, 4));
  out.push(pipe([[108, -36, 24], [146, -36, 24], [146, -20, 24], [162, -8, 26]], 1.1, { tone: "mid", maxLength: 20 }));
  out.push(pipe([[108, -32, 28], [146, -32, 28], [146, -18, 28], [160, -6, 30]], 0.6, { tone: "lo", maxLength: 20 }));
  out.push(valve(132, -8, 10, [1, 0, 0], 0.75));
  out.push(pipe([[112, -8, 10], [128, -8, 10]], 0.75, { tone: "mid", maxLength: 10 }));
  out.push(pipe([[132, -8, 10], [148, -8, 10], [156, -4, 17], [162, 0, 21]], 0.75, { tone: "mid", maxLength: 12 }));
  return out.join("");
}

// ---------------------------------------------------------------------------
// Front service rack: fills the near edge and ties the surface train together.
// ---------------------------------------------------------------------------

function serviceRack(): string {
  const out: string[] = [];
  for (const x of [-24, 118]) {
    out.push(S(k.cylinder(x, 102, 1.1, 0, 7, P, 12), { tone: "mid" }));
    out.push(D([[x, 102, 0]], { size: 0.35, tone: "mid" }));
  }
  out.push(S(k.slabOf({ x: -28, y: 100.5, w: 150, d: 1.8, r: 0.4 }, 6.4, 1.4, P, 3), { tone: "mid" }));
  out.push(pipe([[-26, 102, 7.8], [120, 102, 7.8]], 0.5, { tone: "mid", maxLength: 20 }));
  out.push(pipe([[-26, 102, 5.4], [120, 102, 5.4]], 0.42, { tone: "lo", maxLength: 20 }));
  out.push(pipe([[-26, 102, 3.3], [90, 102, 3.3]], 0.36, { tone: "lo", maxLength: 20 }));
  return out.join("");
}

// ---------------------------------------------------------------------------
// Foreground props: a water-recycle skid and the site office.
// ---------------------------------------------------------------------------

function waterSkid(): string {
  const out: string[] = [];
  out.push(S(k.cylinder(-24, 70, 4.4, 0, 13, P, 22), { tone: "mid", className: "metal" }));
  out.push(S(k.cylinder(-24, 70, 4.9, 12.8, 1, P, 22), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -36, y: 78, w: 12, d: 8, r: 1 }, 0, 4, P, 4, 0.3), { tone: "mid", className: "concrete" }));
  out.push(S(k.cylinder(-31, 84, 2, 4, 4.5, P, 14), { tone: "mid", className: "metal" }));
  out.push(pipe([[31, 52, 8], [10, 56, 8], [-10, 64, 8], [-20, 70, 8]], 0.7, { tone: "lo", maxLength: 14 }));
  out.push(pipe([[-24, 70, 13], [-24, 40, 13], [-12, 20, 13], [0, 0, 13], [8, -18, 10]], 0.6, { tone: "lo", maxLength: 16 }));
  out.push(gauge(-28, 76, 11, 1.9));
  return out.join("");
}

function siteOffice(): string {
  const out: string[] = [];
  const x0 = -52;
  const y0 = 104;
  out.push(S(k.slabOf({ x: x0, y: y0, w: 30, d: 8, r: 0.8 }, 0, 10, P, 4, 0.5), { tone: "lo", className: "concrete" }));
  out.push(S(k.slabOf({ x: x0 - 1, y: y0 - 1, w: 32, d: 10, r: 0.8 }, 10, 1.2, P, 4, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0 + 4, y: y0 + 6.9, w: 5, d: 0.5, r: 0.2 }, 1, 7, P, 3), { tone: "mid" }));
  
  
  out.push(D([[x0 + 2, y0 + 7.2, 10.5]], { size: 0.4, tone: "mid" }));
  return out.join("");
}

function laydown(): string {
  const out: string[] = [];
  for (const x of [128, 170]) {
    out.push(S(k.slabOf({ x: x - 3, y: 106, w: 6, d: 7, r: 0.8 }, 0, 2.2, P, 3, 0.3), { tone: "lo" }));
  }
  for (const [y, z] of [[108, 3.2], [109.6, 4.4], [111.2, 3.8]] as Array<[number, number]>) {
    out.push(pipe([[124, y, z], [178, y, z]], 0.62, { tone: "mid", maxLength: 26 }));
  }
  return out.join("");
}

function yard(): string {
  const out: string[] = [];
  const hard = { x: -30, y: 92, w: 148, d: 16, r: 1.4 };
  out.push(S(k.slabOf(hard, 0, 0.6, P, 4), { tone: "faint", className: "concrete" }));
  out.push(L(k.planOutline(k.insetPlan(hard, 1.2), 0.6, P, 4), { tone: "faint" }));
  for (const x of [-6, 24, 54, 84, 108]) {
    out.push(L(k.segment([x, hard.y, 0.6], [x, hard.y + hard.d, 0.6], P), { tone: "faint" }));
  }
  for (let index = 0; index < 4; index++) {
    out.push(L(k.planOutline({ x: 58 + index * 4.2, y: 101, w: 2, d: 5, r: 0.8 }, 0.6, P, 3), { tone: "lo" }));
  }
  out.push(S(k.slabOf({ x: 8, y: 94, w: 9, d: 6, r: 0.6 }, 0.6, 4, P, 3, 0.3), { tone: "mid", className: "metal" }));
  out.push(S(k.slabOf({ x: 18.5, y: 94.5, w: 7, d: 5.5, r: 0.6 }, 0.6, 3.2, P, 3, 0.3), { tone: "mid", className: "metal" }));
  return out.join("");
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const STATIONS: Array<{ id: string; build: () => string }> = [
  { id: "reservoir", build: reservoir },
  { id: "upgrade", build: upgradeModule },
  { id: "steam", build: steamGenerator },
  { id: "wellpad", build: wellPad },
  { id: "separation", build: separator },
  { id: "blend", build: blendStation },
];

export function buildFigureSvg(): string {
  const stations = STATIONS.map(({ id, build }) => `<g class="station" data-station="${id}">${build()}</g>`).join("");

  const flows = [
    flow(
      [
        [36, -44, 39],
        [36, -44, 50],
        [36, 16, 50],
        [36, 24, 30],
        [20, 24, 14],
        [-40, 24, 14],
        [-100, 24, 14],
        [-150, 30, 12],
      ],
      "lo",
      "flow-steam",
    ),
    flow(
      [
        [-162, 84, 10],
        [-58, 84, 10],
        [-48, 74, 18],
        [-24, 62, 26],
        [-2, 60, 34],
        [20, 56, 42],
        [30, 52, 46],
        [86, 52, 13],
        [104, 58, 13],
        [124, 60, 13],
        [146, 58, 13],
        [182, 48, 16],
        [186, 30, 18],
        [168, 8, 28],
        [146, -10, 34],
      ],
      "mid",
      "flow-oil",
    ),
  ].join("");

  const label =
    "A bench model of the Faja 8° production train on a numbered base plate. A cutaway reservoir block shows layered strata and two horizontal wells; a well pad holds two Christmas trees and a progressing-cavity-pump drive head; a once-through steam generator feeds the pad; a three-phase separator with a sand knock-out and water boot separates the produced fluid; a diluent tank and an open static mixer make the export blend; and an upgrader module holds fractionation columns, coke drums, a hydrotreater and a flare. Pipes and a front service rack join the stations.";

  return k.figureSvg({
    width: FIGURE_WIDTH,
    height: FIGURE_HEIGHT,
    label,
    body: `${basePlate()}${stations}${siteOffice()}${yard()}${serviceRack()}${laydown()}${flows}`,
    className: "train-figure",
  });
}

export { P as FIGURE_PROJECTION };
