import { it } from "vitest";
import { buildFigureSvg } from "../src/figure/scene";

it("counts parts", () => {
  const svg = buildFigureSvg();
  const ids = ["reservoir", "upgrade", "steam", "wellpad", "separation", "blend"];
  const starts = ids.map((id) => svg.indexOf(`data-station="${id}"`));
  const base = svg.indexOf('data-station="reservoir"');
  console.log("base", (svg.slice(0, base).match(/iso-solid/g) ?? []).length);
  for (let index = 0; index < ids.length; index++) {
    const end = index + 1 < ids.length ? starts[index + 1] : svg.indexOf("flow-steam");
    console.log(ids[index], (svg.slice(starts[index], end).match(/iso-solid/g) ?? []).length);
  }
});
