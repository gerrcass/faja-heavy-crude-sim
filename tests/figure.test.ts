import { describe, expect, it } from "vitest";
import { buildFigureSvg } from "../src/figure/scene";

describe("buildFigureSvg", () => {
  const svg = buildFigureSvg();

  it("emits an accessible SVG with six station groups", () => {
    expect(svg).toContain('role="img"');
    expect(svg).toContain("aria-label=");
    for (const station of ["reservoir", "wellpad", "steam", "separation", "blend", "upgrade"]) {
      expect(svg).toContain(`data-station="${station}"`);
    }
  });

  it("is a dense object of 80 to 150 solid parts", () => {
    const solids = svg.match(/class="iso-solid/g) ?? [];
    expect(solids.length).toBeGreaterThanOrEqual(80);
    expect(solids.length).toBeLessThanOrEqual(150);
  });

  it("contains no invalid coordinates", () => {
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });
});
