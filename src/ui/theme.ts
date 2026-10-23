type Theme = "light" | "dark";

const KEY = "faja-theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

const stored = (): Theme | null => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

const systemTheme = (): Theme => (media.matches ? "dark" : "light");

const apply = (theme: Theme, buttons: HTMLButtonElement[], labels: HTMLElement[]) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  for (const figure of document.querySelectorAll<HTMLElement>("[data-figure-root]")) {
    figure.dataset.theme = theme;
  }
  for (const button of buttons) {
    const dark = theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Switch to paper theme" : "Switch to ink theme");
  }
  for (const label of labels) label.textContent = theme === "dark" ? "Paper" : "Ink";
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#16130f" : "#f2ece1";
};

export function mountTheme(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]")];
  const labels = [...document.querySelectorAll<HTMLElement>("[data-theme-label]")];
  if (!buttons.length) return;

  let choice = stored();
  apply(choice ?? systemTheme(), buttons, labels);

  const update = (theme: Theme, persist: boolean) => {
    if (persist) {
      try {
        localStorage.setItem(KEY, theme);
      } catch {
        // A blocked storage API should not break the toggle.
      }
      choice = theme;
    }
    apply(theme, buttons, labels);
  };

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      update(current === "dark" ? "light" : "dark", true);
    });
  }

  media.addEventListener("change", () => {
    if (!choice) apply(systemTheme(), buttons, labels);
  });
}
