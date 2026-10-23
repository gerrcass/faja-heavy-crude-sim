import { buildFigureSvg } from "./scene";
import { STATIONS, stationById, type StationId } from "./stations";

interface FigureElements {
  root: HTMLElement;
  stage: HTMLElement;
  readout: HTMLElement;
  detail: HTMLElement;
  buttons: HTMLButtonElement[];
}

const elements = (figure: HTMLElement): FigureElements => {
  const stage = figure.querySelector<HTMLElement>("[data-figure-stage]");
  const readout = figure.querySelector<HTMLElement>("[data-readout]");
  const detail = figure.querySelector<HTMLElement>("[data-station-detail]");
  if (!stage || !readout || !detail) throw new Error("Figure markup is incomplete");
  return {
    root: figure.querySelector<HTMLElement>("[data-figure-root]") ?? figure,
    stage,
    readout,
    detail,
    buttons: [...figure.querySelectorAll<HTMLButtonElement>("[data-station-button]")],
  };
};

const renderDetail = (el: HTMLElement, id: StationId) => {
  const station = stationById(id);
  if (!station) return;
  el.innerHTML = `
    <p class="station-detail__eyebrow">Station ${station.number} · ${station.metric}</p>
    <h3 class="station-detail__title">${station.label}</h3>
    <p class="station-detail__copy">${station.detail}</p>
    <a class="text-link" href="${station.href}">Read ${station.section.toLowerCase()} <span aria-hidden="true">→</span></a>
  `;
};

export function mountFigure(figure: HTMLElement): void {
  const { root, stage, readout, detail, buttons } = elements(figure);
  stage.innerHTML = buildFigureSvg();

  // Re-query after the SVG is injected.
  const groups = [...stage.querySelectorAll<SVGGElement>("[data-station]")];
  let active: StationId | null = null;

  const reset = () => {
    active = null;
    for (const group of groups) group.classList.remove("is-active", "is-dim");
    for (const button of buttons) {
      button.setAttribute("aria-pressed", "false");
      button.dataset.active = "false";
    }
    root.removeAttribute("data-active");
    readout.textContent = "06 stations · select one";
    detail.innerHTML = `
      <p class="station-detail__eyebrow">Six stations</p>
      <h3 class="station-detail__title">Select a station</h3>
      <p class="station-detail__copy">Light one part of the train to see what it does. The drawing stays presentational; the buttons carry the state.</p>
    `;
  };

  const setStation = (id: StationId, announce = true) => {
    active = id;
    const station = stationById(id);
    for (const group of groups) {
      const on = group.dataset.station === id;
      group.classList.toggle("is-active", on);
      group.classList.toggle("is-dim", !on);
    }
    for (const button of buttons) {
      const on = button.dataset.stationButton === id;
      button.setAttribute("aria-pressed", String(on));
      button.dataset.active = String(on);
    }
    root.dataset.active = id;
    if (station) {
      readout.textContent = `${station.number} · ${station.label} — ${station.metric}`;
      renderDetail(detail, id);
    }
  };

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const id = button.dataset.stationButton;
      if (id) setStation(id as StationId);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = buttons.indexOf(button);
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
      const id = buttons[next]?.dataset.stationButton;
      if (id) setStation(id as StationId);
    });
  }

  reset();

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      root.dataset.inview = String(Boolean(entry?.isIntersecting));
    },
    { rootMargin: "80px 0px" },
  );
  observer.observe(root);

  // If the page starts with a station in the hash, honour it.
  const hash = window.location.hash.replace("#station-", "");
  if (STATIONS.some((station) => station.id === hash)) setStation(hash as StationId, false);
  void active;
}
