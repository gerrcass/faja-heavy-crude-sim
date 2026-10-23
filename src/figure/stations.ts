export type StationId = "reservoir" | "wellpad" | "steam" | "separation" | "blend" | "upgrade";

export interface Station {
  id: StationId;
  number: string;
  label: string;
  metric: string;
  summary: string;
  detail: string;
  href: string;
  section: string;
}

export const STATIONS: Station[] = [
  {
    id: "reservoir",
    number: "01",
    label: "Reservoir",
    metric: "150–1,400 m deep",
    summary: "Layered Oficina sands, two horizontal wells.",
    detail:
      "The Oficina Formation is a stack of unconsolidated fluvial and tidal sands. Two horizontal wells run through the pay, exposing hundreds of metres of sand instead of the few metres a vertical well would see.",
    href: "#deposit",
    section: "The deposit",
  },
  {
    id: "wellpad",
    number: "02",
    label: "Well pad",
    metric: "1–2 km laterals",
    summary: "Christmas trees, flowlines and a PCP drive head.",
    detail:
      "A pad clusters many directional wells on one surface location. Each Christmas tree controls one well; the drive head turns the polished rod of a progressing-cavity pump, which lifts viscous, sandy fluid without an ESP's intolerance of solids.",
    href: "#cold-start",
    section: "Cold start",
  },
  {
    id: "steam",
    number: "03",
    label: "Steam",
    metric: "300–340 °C",
    summary: "Once-through generator, 70–80% quality.",
    detail:
      "The generator burns fuel gas to make wet steam for cyclic stimulation or flooding. Quality is the mass fraction that is vapour; higher quality carries more latent heat per tonne of water and lowers the steam-oil ratio.",
    href: "#heat",
    section: "Heat",
  },
  {
    id: "separation",
    number: "04",
    label: "Separation",
    metric: "oil · gas · water",
    summary: "Three phases, sand knock-out and a water boot.",
    detail:
      "The three-phase separator splits produced fluid into gas, oil and water. Sand is removed at the knock-out; gas can return to the steam generator as fuel, and water goes to treatment and recycle.",
    href: "#separation",
    section: "Separation and water",
  },
  {
    id: "blend",
    number: "05",
    label: "Blend",
    metric: "20–35 vol% diluent",
    summary: "Diluent tank, static mixer, custody point.",
    detail:
      "Extra-heavy crude cannot meet a pipeline viscosity specification on its own. Naphtha or condensate is blended in, usually 20–35 vol%, and the blend's gravity and viscosity become the custody-transfer numbers.",
    href: "#blend",
    section: "Blend",
  },
  {
    id: "upgrade",
    number: "06",
    label: "Upgrade",
    metric: "480–505 °C coker",
    summary: "Columns, coke drums and a hydrotreater.",
    detail:
      "An upgrader rejects carbon in a delayed coker and adds hydrogen in a hydrotreater. One Orinoco example turned an 8° API, 4.3 wt% sulfur feed into a 32° API synthetic crude with 0.2 wt% sulfur.",
    href: "#upgrade",
    section: "Upgrade",
  },
];

export const DEFAULT_STATION: StationId = "reservoir";

export const stationById = (id: string): Station | undefined => STATIONS.find((station) => station.id === id);
