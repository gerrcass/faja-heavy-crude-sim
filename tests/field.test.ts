import { describe, expect, it } from "vitest";
import {
  LIMITS,
  PRESETS,
  simulate,
  viscosityCurve,
  type FieldInput,
  type Mode,
} from "../src/model/field";

const input = (over: Partial<FieldInput> = {}): FieldInput => ({
  mode: "css",
  steamRate: 300,
  steamQuality: 75,
  diluent: 34,
  pumpSpeed: 60,
  ...over,
});

const preset = (id: string) => {
  const found = PRESETS.find((item) => item.id === id);
  if (!found) throw new Error(`missing preset ${id}`);
  return simulate(found.input);
};

describe("simulate", () => {
  it("returns the declared output shape for a known CSS point", () => {
    const out = simulate(input());
    expect(out.oilRate).toBeCloseTo(564.7, 1);
    expect(out.sor).toBeCloseTo(3.34, 2);
    expect(out.blendViscosity).toBeCloseTo(331.5, 1);
    expect(out.blendApi).toBeCloseTo(21.39, 1);
    expect(out.waterMake).toBeCloseTo(383.7, 1);
    expect(out.carbonIntensity).toBeCloseTo(85.7, 1);
    expect(out.constraints.map((item) => item.id)).toEqual(["blend", "sor", "pump"]);
    expect(out.constrained).toBe(false);
  });

  it("uses no steam and emits less carbon in cold mode", () => {
    const cold = simulate(input({ mode: "cold", steamRate: 300 }));
    const thermal = simulate(input({ mode: "css", steamRate: 300 }));
    expect(cold.mode).toBe("cold");
    expect(cold.steamBbl).toBe(0);
    expect(cold.sor).toBe(0);
    expect(cold.carbonIntensity).toBeLessThan(thermal.carbonIntensity);
    expect(cold.carbonIntensity).toBeCloseTo(22.9, 1);
  });

  it("raises oil rate and SOR when steam rises", () => {
    const low = simulate(input({ steamRate: 100 }));
    const high = simulate(input({ steamRate: 300 }));
    expect(high.oilRate).toBeGreaterThan(low.oilRate);
    expect(high.sor).toBeGreaterThan(low.sor);
    expect(low.oilRate).toBeCloseTo(433.1, 1);
    expect(high.oilRate).toBeCloseTo(564.7, 1);
  });

  it("lowers SOR when steam quality rises", () => {
    const wet = simulate(input({ steamQuality: 70 }));
    const dry = simulate(input({ steamQuality: 90 }));
    expect(dry.sor).toBeLessThan(wet.sor);
    expect(wet.sor).toBeCloseTo(3.385, 2);
    expect(dry.sor).toBeCloseTo(3.217, 2);
  });

  it("lowers viscosity and raises API as diluent rises", () => {
    const lean = simulate(input({ mode: "cold", diluent: 20 }));
    const rich = simulate(input({ mode: "cold", diluent: 35 }));
    expect(rich.blendViscosity).toBeLessThan(lean.blendViscosity);
    expect(rich.blendApi).toBeGreaterThan(lean.blendApi);
    expect(lean.blendViscosity).toBeCloseTo(1092.3, 1);
    expect(rich.blendViscosity).toBeCloseTo(304.4, 1);
    expect(lean.blendApi).toBeCloseTo(15.76, 1);
    expect(rich.blendApi).toBeCloseTo(21.81, 1);
  });

  it("caps the oil rate when the pump is the bottleneck", () => {
    const slow = simulate(input({ steamRate: 400, pumpSpeed: 20 }));
    const fast = simulate(input({ steamRate: 400, pumpSpeed: 60 }));
    expect(slow.oilRate).toBeCloseTo(220, 0);
    expect(fast.oilRate).toBeGreaterThan(600);
    expect(slow.oilRate).toBeLessThan(fast.oilRate);
    expect(slow.constraints.find((item) => item.id === "pump")?.active).toBe(true);
    expect(fast.constraints.find((item) => item.id === "pump")?.active).toBe(false);
  });

  it("flags an off-spec blend when diluent is too low", () => {
    const out = simulate(input({ mode: "cold", diluent: 20 }));
    expect(out.blendViscosity).toBeGreaterThan(350);
    expect(out.constraints.find((item) => item.id === "blend")?.active).toBe(true);
    expect(out.constrained).toBe(true);
  });

  it("flags a punitive SOR when steam is high and the pump is slow", () => {
    const out = simulate(input({ mode: "css", steamRate: 400, pumpSpeed: 20 }));
    expect(out.sor).toBeGreaterThan(5);
    expect(out.constraints.find((item) => item.id === "sor")?.active).toBe(true);
  });

  it("stays finite and inside declared bounds over a grid", () => {
    const modes: Mode[] = ["cold", "css"];
    for (const mode of modes) {
      for (const steamRate of [0, 100, 250, 400]) {
        for (const steamQuality of [60, 75, 95]) {
          for (const diluent of [10, 25, 40]) {
            for (const pumpSpeed of [20, 40, 60]) {
              const out = simulate({ mode, steamRate, steamQuality, diluent, pumpSpeed });
              for (const value of [
                out.oilRate,
                out.sor,
                out.blendViscosity,
                out.blendApi,
                out.waterMake,
                out.carbonIntensity,
                out.energy,
                out.diluentPerOil,
                out.pumpCapacity,
                out.pumpUtilization,
              ]) {
                expect(Number.isFinite(value)).toBe(true);
              }
              expect(out.oilRate).toBeGreaterThanOrEqual(0);
              expect(out.oilRate).toBeLessThanOrEqual(800);
              expect(out.sor).toBeGreaterThanOrEqual(0);
              expect(out.sor).toBeLessThanOrEqual(12);
              expect(out.blendViscosity).toBeGreaterThanOrEqual(150);
              expect(out.blendViscosity).toBeLessThanOrEqual(3000);
              expect(out.blendApi).toBeGreaterThanOrEqual(8);
              expect(out.blendApi).toBeLessThanOrEqual(30);
              expect(out.waterMake).toBeGreaterThanOrEqual(0);
              expect(out.waterMake).toBeLessThanOrEqual(1200);
              expect(out.carbonIntensity).toBeGreaterThanOrEqual(0);
              expect(out.carbonIntensity).toBeLessThanOrEqual(300);
              expect(out.energy).toBeGreaterThanOrEqual(0);
              expect(out.energy).toBeLessThanOrEqual(6);
              expect(out.diluentPerOil).toBeGreaterThanOrEqual(0);
              expect(out.diluentPerOil).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    }
  });

  it("clamps inputs outside the published ranges", () => {
    const out = simulate({ mode: "css", steamRate: 9999, steamQuality: 150, diluent: 90, pumpSpeed: 120 });
    expect(out.steamBbl).toBeLessThanOrEqual(LIMITS.steamRate[1] * 6.2898);
    expect(out.blendApi).toBeLessThan(30);
    expect(out.oilRate).toBeLessThanOrEqual(800);
    expect(Number.isFinite(out.carbonIntensity)).toBe(true);
  });

  it("is deterministic", () => {
    expect(simulate(input())).toEqual(simulate(input()));
  });
});

describe("presets", () => {
  it("produce the documented ordering", () => {
    const cold = preset("cold");
    const conventional = preset("css");
    const optimized = preset("optimized");

    expect(cold.oilRate).toBeCloseTo(257.6, 1);
    expect(conventional.oilRate).toBeCloseTo(515.5, 1);
    expect(optimized.oilRate).toBeCloseTo(558.3, 1);
    expect(optimized.oilRate).toBeGreaterThan(conventional.oilRate);
    expect(conventional.oilRate).toBeGreaterThan(cold.oilRate);

    expect(cold.sor).toBe(0);
    expect(optimized.sor).toBeLessThan(conventional.sor);
    expect(optimized.sor).toBeCloseTo(3.04, 2);

    expect(optimized.blendViscosity).toBeLessThan(conventional.blendViscosity);
    expect(conventional.blendViscosity).toBeLessThan(cold.blendViscosity);
    expect(optimized.blendApi).toBeGreaterThan(conventional.blendApi);
    expect(conventional.blendApi).toBeGreaterThan(cold.blendApi);

    expect(cold.carbonIntensity).toBeLessThan(optimized.carbonIntensity);
    expect(optimized.carbonIntensity).toBeLessThan(conventional.carbonIntensity);
    expect(cold.constrained).toBe(false);
    expect(conventional.constrained).toBe(false);
    expect(optimized.constrained).toBe(false);
  });
});

describe("viscosityCurve", () => {
  it("is decreasing and shares the model's values", () => {
    const base = { mode: "css" as const, steamRate: 300, steamQuality: 75, diluent: 34, pumpSpeed: 60 };
    const curve = viscosityCurve(base, 10, 40, 4);
    expect(curve.map((point) => point.diluent)).toEqual([10, 20, 30, 40]);
    expect(curve[0].viscosity).toBeCloseTo(2560.1, 1);
    expect(curve[3].viscosity).toBeCloseTo(198.9, 1);
    for (let index = 1; index < curve.length; index++) {
      expect(curve[index].viscosity).toBeLessThan(curve[index - 1].viscosity);
    }
    expect(curve[2].viscosity).toBe(simulate({ ...base, diluent: 30 }).blendViscosity);
  });
});
