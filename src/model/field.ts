/**
 * Illustrative field model for one Faja well.
 *
 * This is a systems model, not a reservoir simulator. It is deterministic,
 * bounded to the published ranges in docs/research/orinoco-brief.md, and
 * monotone in the directions the physics requires. Every constant that is a
 * modelling choice rather than a quoted fact is marked ILLUSTRATIVE.
 */

export type Mode = "cold" | "css";

export interface FieldInput {
  mode: Mode;
  /** tonnes of steam per day (cold-water equivalent). Ignored in cold mode. */
  steamRate: number;
  /** steam quality, percent vapour by mass. Ignored in cold mode. */
  steamQuality: number;
  /** diluent fraction of the blended export stream, volume percent. */
  diluent: number;
  /** progressing-cavity pump speed, hertz. */
  pumpSpeed: number;
}

export type ConstraintId = "blend" | "sor" | "pump";

export interface ConstraintState {
  id: ConstraintId;
  active: boolean;
  detail: string;
}

export interface FieldOutput {
  mode: Mode;
  /** bbl/d. */
  oilRate: number;
  /** bbl steam (cold-water equivalent) per bbl oil; 0 in cold mode. */
  sor: number;
  /** cSt at 50 °C. */
  blendViscosity: number;
  /** API gravity of the blended stream. */
  blendApi: number;
  /** bbl/d of produced water. */
  waterMake: number;
  /** kg CO2e per bbl oil, illustrative well-to-tank boundary. */
  carbonIntensity: number;
  /** GJ per bbl oil. */
  energy: number;
  /** bbl diluent per bbl crude oil. */
  diluentPerOil: number;
  /** bbl/d the pump can lift. */
  pumpCapacity: number;
  /** inflow divided by pump capacity; above 1 means the pump is the bottleneck. */
  pumpUtilization: number;
  /** bbl/d of steam, cold-water equivalent. */
  steamBbl: number;
  constraints: ConstraintState[];
  constrained: boolean;
}

export const LIMITS = {
  steamRate: [0, 400],
  steamQuality: [60, 95],
  diluent: [10, 40],
  pumpSpeed: [20, 60],
} as const;

/** Reference pipeline viscosity for the blend, cSt at 50 °C. ILLUSTRATIVE. */
export const BLEND_SPEC_CST = 350;
/** Above this the steam-oil ratio is treated as punitive. ILLUSTRATIVE. */
export const SOR_LIMIT = 5;
/** One tonne of water is 6.2898 barrels. */
export const BBL_PER_TONNE = 6.2898;
/** Dead-oil viscosity of the extra-heavy crude at 50 °C, cSt. ILLUSTRATIVE. */
export const CRUDE_VISCOSITY_CST = 6000;
/** Diluent viscosity at 50 °C, cSt. ILLUSTRATIVE. */
export const DILUENT_VISCOSITY_CST = 1.2;
/** Anchor gravity of the crude, API. The brief's range is 8–10° typical. */
export const CRUDE_API = 8.4;
/** Naphtha-range diluent gravity, API. ILLUSTRATIVE. */
export const DILUENT_API = 55;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const sgOf = (api: number) => 141.5 / (131.5 + api);
const apiOf = (sg: number) => 141.5 / sg - 131.5;

const round = (value: number, places: number) => {
  const size = 10 ** places;
  return Math.round(value * size) / size;
};

const clean = (value: number) => (Number.isFinite(value) ? value : 0);

export function simulate(input: FieldInput): FieldOutput {
  const mode: Mode = input.mode === "css" ? "css" : "cold";
  const steamRate = mode === "css" ? clamp(input.steamRate, ...LIMITS.steamRate) : 0;
  const steamQuality = clamp(input.steamQuality, ...LIMITS.steamQuality);
  const diluent = clamp(input.diluent, ...LIMITS.diluent);
  const pumpSpeed = clamp(input.pumpSpeed, ...LIMITS.pumpSpeed);

  // Pump capacity and cold inflow both scale with speed. The thermal gain is
  // added on top and is what can exceed the pump's capacity.
  const pumpCapacity = 11 * pumpSpeed;
  const coldOil = 5.6 * pumpSpeed;
  const qualityFactor = 0.45 + 0.0055 * steamQuality;
  const thermalGain = mode === "css" ? 3.1 * Math.pow(steamRate, 0.78) * qualityFactor : 0;
  const inflow = coldOil + thermalGain;
  const oilRate = Math.max(0, Math.min(inflow, pumpCapacity));

  const steamBbl = steamRate * BBL_PER_TONNE;
  const sor = mode === "css" && oilRate > 0 ? steamBbl / oilRate : 0;

  // Water make: a base water cut plus the share of injected steam that returns.
  const formationWater = 0.22 * oilRate;
  const steamReturn = mode === "css" ? steamBbl * 0.55 * (1 - steamQuality / 100) : 0;
  const waterMake = formationWater + steamReturn;

  // Arrhenius-style log mixing for viscosity; volumetric mass mixing for API.
  const fraction = diluent / 100;
  const blendViscosity = Math.exp(
    (1 - fraction) * Math.log(CRUDE_VISCOSITY_CST) + fraction * Math.log(DILUENT_VISCOSITY_CST),
  );
  const blendSg = (1 - fraction) * sgOf(CRUDE_API) + fraction * sgOf(DILUENT_API);
  const blendApi = apiOf(blendSg);

  // Steam generation dominates the thermal path. Pump and diluent terms are
  // small, illustrative overheads.
  const steamGjPerTonne = 1.55 + 0.75 * (steamQuality / 100);
  const steamCo2 = steamRate * steamGjPerTonne * 56; // kg/d at 56 kg CO2 per GJ
  const baseCo2 = 8 * oilRate;
  const diluentCo2 = 0.35 * diluent * oilRate;
  const pumpCo2 = 0.05 * pumpSpeed * oilRate;
  const carbonIntensity = oilRate > 0 ? (steamCo2 + baseCo2 + diluentCo2 + pumpCo2) / oilRate : 0;

  const energy = oilRate > 0 ? (steamRate * steamGjPerTonne) / oilRate + 0.0006 * pumpSpeed : 0;
  const diluentPerOil = fraction < 1 ? fraction / (1 - fraction) : 0;

  const constraints: ConstraintState[] = [
    {
      id: "blend",
      active: blendViscosity > BLEND_SPEC_CST,
      detail: `Blend is off spec: ${Math.round(blendViscosity)} cSt at 50 °C against a ${BLEND_SPEC_CST} cSt reference.`,
    },
    {
      id: "sor",
      active: mode === "css" && sor > SOR_LIMIT,
      detail: `Steam-oil ratio is punitive: ${sor.toFixed(1)} bbl steam per bbl oil.`,
    },
    {
      id: "pump",
      active: inflow > pumpCapacity + 1e-9,
      detail: `Pump is the bottleneck: ${Math.round(inflow)} bbl/d of inflow against ${Math.round(pumpCapacity)} bbl/d of capacity.`,
    },
  ];

  return {
    mode,
    oilRate: clean(round(oilRate, 2)),
    sor: clean(round(sor, 3)),
    blendViscosity: clean(round(blendViscosity, 1)),
    blendApi: clean(round(blendApi, 2)),
    waterMake: clean(round(waterMake, 1)),
    carbonIntensity: clean(round(carbonIntensity, 1)),
    energy: clean(round(energy, 3)),
    diluentPerOil: clean(round(diluentPerOil, 3)),
    pumpCapacity: clean(round(pumpCapacity, 1)),
    pumpUtilization: clean(round(inflow / pumpCapacity, 3)),
    steamBbl: clean(round(steamBbl, 1)),
    constraints,
    constrained: constraints.some((constraint) => constraint.active),
  };
}

export interface Preset {
  id: "cold" | "css" | "optimized";
  name: string;
  note: string;
  input: FieldInput;
}

export const PRESETS: Preset[] = [
  {
    id: "cold",
    name: "Cold production",
    note: "Horizontal wells, PCP lift, diluent to pipeline spec. No steam.",
    input: { mode: "cold", steamRate: 0, steamQuality: 70, diluent: 34, pumpSpeed: 46 },
  },
  {
    id: "css",
    name: "Conventional CSS",
    note: "Cyclic steam at field-generator quality, moderate pump speed.",
    input: { mode: "css", steamRate: 300, steamQuality: 72, diluent: 35, pumpSpeed: 52 },
  },
  {
    id: "optimized",
    name: "Optimized CSS",
    note: "Less steam at higher quality, a larger diluent fraction and a faster pump.",
    input: { mode: "css", steamRate: 270, steamQuality: 92, diluent: 36, pumpSpeed: 58 },
  },
];

export interface CurvePoint {
  diluent: number;
  viscosity: number;
}

/** Blend viscosity against diluent fraction, computed with the same model. */
export function viscosityCurve(base: FieldInput, from = LIMITS.diluent[0], to = LIMITS.diluent[1], steps = 13): CurvePoint[] {
  const out: CurvePoint[] = [];
  for (let index = 0; index < steps; index++) {
    const diluent = from + ((to - from) * index) / (steps - 1);
    out.push({
      diluent: Math.round(diluent * 10) / 10,
      viscosity: simulate({ ...base, diluent }).blendViscosity,
    });
  }
  return out;
}

export const ASSUMPTIONS = [
  "One well, one day, at a steady operating point. No decline curve, no transient flow.",
  "The pump lifts oil; produced water is reported separately so the levers stay readable. Real pumps lift the whole liquid stream.",
  "Blend viscosity is dead oil at 50 °C, mixed by a log rule. The 350 cSt reference is a teaching line, not a custody specification.",
  "Carbon intensity is an illustrative well-to-tank boundary: steam fuel, diluent, pumping and a fixed processing term.",
  "Steam quality changes the heat carried per tonne and the share of steam that returns as water.",
];
