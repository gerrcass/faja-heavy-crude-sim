import "@fontsource/fraunces/latin-400.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-400-italic.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";

import "./iso/iso.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/figure.css";
import "./styles/control-desk.css";

import { mountFigure } from "./figure/mount";
import { mountSimulator } from "./ui/simulator";
import { mountTheme } from "./ui/theme";
import { mountReveal } from "./ui/reveal";

mountTheme();

const figure = document.querySelector<HTMLElement>("[data-figure]");
if (figure) mountFigure(figure);

const simulator = document.querySelector<HTMLElement>("[data-simulator]");
if (simulator) mountSimulator(simulator);

mountReveal();
