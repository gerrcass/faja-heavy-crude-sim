import {
  LIMITS,
  PRESETS,
  simulate,
  viscosityCurve,
  type FieldInput,
  type FieldOutput,
  type Mode,
} from "../model/field";

const nf = (value: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function mountSimulator(root: HTMLElement): void {
  const ranges = {
    steamRate: root.querySelector<HTMLInputElement>('[data-input="steamRate"]'),
    steamQuality: root.querySelector<HTMLInputElement>('[data-input="steamQuality"]'),
    diluent: root.querySelector<HTMLInputElement>('[data-input="diluent"]'),
    pumpSpeed: root.querySelector<HTMLInputElement>('[data-input="pumpSpeed"]'),
  };
  const modes = [...root.querySelectorAll<HTMLInputElement>('[data-input="mode"]')];
  const presetButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-preset]")];
  const constraint = root.querySelector<HTMLElement>("[data-constraint]");
  const constraintList = root.querySelector<HTMLElement>("[data-constraints]");
  const chart = root.querySelector<HTMLElement>("[data-chart]");
  const lever = (key: string) => root.querySelector<HTMLElement>(`[data-lever="${key}"]`);
  const valueOut = (key: string) => root.querySelector<HTMLElement>(`[data-value="${key}"]`);
  const output = (key: string) => root.querySelector<HTMLElement>(`[data-output="${key}"]`);
  const ledger = (key: string) => ({
    bar: root.querySelector<HTMLElement>(`[data-ledger-bar="${key}"]`),
    value: root.querySelector<HTMLElement>(`[data-ledger-value="${key}"]`),
  });

  if (!ranges.steamRate || !ranges.steamQuality || !ranges.diluent || !ranges.pumpSpeed || !constraint || !constraintList || !chart) {
    throw new Error("Control desk markup is incomplete");
  }

  const controls = ranges as { steamRate: HTMLInputElement; steamQuality: HTMLInputElement; diluent: HTMLInputElement; pumpSpeed: HTMLInputElement };

  const read = (): FieldInput => ({
    mode: (modes.find((input) => input.checked)?.value === "cold" ? "cold" : "css") as Mode,
    steamRate: Number(controls.steamRate.value),
    steamQuality: Number(controls.steamQuality.value),
    diluent: Number(controls.diluent.value),
    pumpSpeed: Number(controls.pumpSpeed.value),
  });

  const setText = (key: string, text: string) => {
    const el = output(key);
    if (el) el.textContent = text;
  };

  const setLedger = (key: string, value: number, max: number, text: string) => {
    const row = ledger(key);
    if (row.bar) row.bar.style.width = `${clamp((value / max) * 100, 0, 100).toFixed(1)}%`;
    if (row.value) row.value.textContent = text;
  };

  const chartSvg = (out: FieldOutput, input: FieldInput): string => {
    const W = 640;
    const H = 248;
    const m = { l: 56, r: 22, t: 22, b: 38 };
    const xMin = LIMITS.diluent[0];
    const xMax = LIMITS.diluent[1];
    const yMin = 150;
    const yMax = 3000;
    const x = (value: number) => m.l + ((value - xMin) / (xMax - xMin)) * (W - m.l - m.r);
    const y = (value: number) => {
      const t = (Math.log(value) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin));
      return m.t + (1 - t) * (H - m.t - m.b);
    };
    const curve = viscosityCurve(input, xMin, xMax, 31);
    const points = curve.map((point) => `${x(point.diluent).toFixed(1)} ${y(point.viscosity).toFixed(1)}`);
    const path = `M${points.join("L")}`;
    const grid = [200, 350, 1000, 3000]
      .map((value) => {
        const yy = y(value).toFixed(1);
        const label = value === 350 ? "350" : nf(value);
        return `<line class="chart-grid" x1="${m.l}" y1="${yy}" x2="${W - m.r}" y2="${yy}"/><text class="chart-label" x="${m.l - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${label}</text>`;
      })
      .join("");
    const xTicks = [10, 20, 30, 40]
      .map((value) => `<line class="chart-grid" x1="${x(value)}" y1="${m.t}" x2="${x(value)}" y2="${H - m.b}"/><text class="chart-label" x="${x(value)}" y="${H - m.b + 16}" text-anchor="middle">${value}</text>`)
      .join("");
    const specY = y(350).toFixed(1);
    const markerX = x(clamp(input.diluent, xMin, xMax));
    const markerY = y(clamp(out.blendViscosity, yMin + 1, yMax - 1));
    const markerLabelY = markerY < m.t + 34 ? markerY + 18 : markerY - 12;
    const markerLabelX = markerX > W - 108 ? markerX - 8 : markerX + 10;
    const anchor = markerX > W - 108 ? "end" : "start";
    const marker = `<circle class="chart-marker" cx="${markerX.toFixed(1)}" cy="${markerY.toFixed(1)}" r="4.2"/><circle class="chart-marker-fill" cx="${markerX.toFixed(1)}" cy="${markerY.toFixed(1)}" r="1.8"/><text class="chart-marker-label" x="${markerLabelX.toFixed(1)}" y="${markerLabelY.toFixed(1)}" text-anchor="${anchor}">${nf(out.blendViscosity)} cSt · ${nf(input.diluent)}%</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
      <text class="chart-label" x="${m.l}" y="12">cSt at 50 °C · log scale</text>
      ${grid}
      ${xTicks}
      <line class="chart-axis" x1="${m.l}" y1="${H - m.b}" x2="${W - m.r}" y2="${H - m.b}"/>
      <line class="chart-axis" x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${H - m.b}"/>
      <line class="chart-spec" x1="${m.l}" y1="${specY}" x2="${W - m.r}" y2="${specY}"/>
      <text class="chart-value" x="${W - m.r}" y="${Number(specY) - 5}" text-anchor="end">350 cSt reference</text>
      <path class="chart-curve" d="${path}"/>
      ${marker}
      <text class="chart-label" x="${W - m.r}" y="${H - 8}" text-anchor="end">diluent, vol%</text>
    </svg>`;
  };

  const render = (fromPreset = false) => {
    const input = read();
    const out = simulate(input);
    const cold = input.mode === "cold";

    for (const key of ["steamRate", "steamQuality"] as const) {
      const el = controls[key];
      if (!el) continue;
      el.disabled = cold;
      const wrap = lever(key);
      if (wrap) wrap.dataset.inactive = String(cold);
    }

    const rateOut = valueOut("steamRate");
    if (rateOut) rateOut.textContent = cold ? "not used" : `${nf(input.steamRate)} t/d`;
    const qualityOut = valueOut("steamQuality");
    if (qualityOut) qualityOut.textContent = cold ? "not used" : `${nf(input.steamQuality)}%`;
    const diluentOut = valueOut("diluent");
    if (diluentOut) diluentOut.textContent = `${nf(input.diluent)} vol%`;
    const pumpOut = valueOut("pumpSpeed");
    if (pumpOut) pumpOut.textContent = `${nf(input.pumpSpeed)} Hz`;

    controls.steamRate.setAttribute("aria-valuetext", cold ? "Not used in cold production" : `${input.steamRate} tonnes per day`);
    controls.steamQuality.setAttribute("aria-valuetext", cold ? "Not used in cold production" : `${input.steamQuality} percent`);
    controls.diluent.setAttribute("aria-valuetext", `${input.diluent} percent by volume`);
    controls.pumpSpeed.setAttribute("aria-valuetext", `${input.pumpSpeed} hertz`);

    setText("oilRate", nf(out.oilRate));
    setText("sor", out.sor.toFixed(2));
    setText("blendViscosity", nf(out.blendViscosity));
    setText("blendApi", out.blendApi.toFixed(1));
    setText("waterMake", nf(out.waterMake));
    setText("carbonIntensity", nf(out.carbonIntensity));

    const active = out.constraints.filter((item) => item.active);
    if (active.length === 0) {
      constraint.dataset.state = "ok";
      constraint.textContent = "Within the model’s operating envelope.";
    } else {
      constraint.dataset.state = "warn";
      const names = active.map((item) => (item.id === "blend" ? "blend off spec" : item.id === "sor" ? "punitive SOR" : "pump at capacity"));
      constraint.textContent = `Constraint: ${names.join(" · ")}.`;
    }
    constraintList.innerHTML = active.map((item) => `<p>${item.detail}</p>`).join("");

    const waterPerOil = out.oilRate > 0 ? out.waterMake / out.oilRate : 0;
    setLedger("steam", out.sor, 8, `${out.sor.toFixed(2)} bbl/bbl`);
    setLedger("water", waterPerOil, 2, `${waterPerOil.toFixed(2)} bbl/bbl`);
    setLedger("diluent", out.diluentPerOil, 0.8, `${out.diluentPerOil.toFixed(2)} bbl/bbl`);
    setLedger("energy", out.energy, 3, `${out.energy.toFixed(2)} GJ/bbl`);
    setLedger("carbon", out.carbonIntensity, 150, `${nf(out.carbonIntensity)} kg/bbl`);

    chart.innerHTML = chartSvg(out, input);
    chart.setAttribute(
      "aria-label",
      `Blend viscosity against diluent fraction. The model gives ${nf(out.blendViscosity)} centistokes at ${input.diluent} percent diluent, against a 350 centistoke reference. Viscosity falls from ${nf(viscosityCurve(input, 10, 40, 2)[0].viscosity)} centistokes at 10 percent to ${nf(viscosityCurve(input, 10, 40, 2)[1].viscosity)} centistokes at 40 percent.`,
    );

    if (!fromPreset) {
      for (const button of presetButtons) button.setAttribute("aria-pressed", "false");
    }
  };

  for (const el of Object.values(controls)) {
    el?.addEventListener("input", () => render());
  }
  for (const input of modes) input.addEventListener("change", () => render());

  for (const button of presetButtons) {
    button.addEventListener("click", () => {
      const preset = PRESETS.find((item) => item.id === button.dataset.preset);
      if (!preset) return;
      for (const mode of modes) mode.checked = mode.value === preset.input.mode;
      controls.steamRate.value = String(preset.input.steamRate);
      controls.steamQuality.value = String(preset.input.steamQuality);
      controls.diluent.value = String(preset.input.diluent);
      controls.pumpSpeed.value = String(preset.input.pumpSpeed);
      for (const other of presetButtons) other.setAttribute("aria-pressed", String(other === button));
      render(true);
    });
  }

  render(true);
}
