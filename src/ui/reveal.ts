export function mountReveal(): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) return;

  const targets = [...document.querySelectorAll<HTMLElement>(".section")].filter((section) => section.id !== "figure");
  targets.forEach((section) => section.setAttribute("data-reveal", ""));

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.04 },
  );

  for (const target of targets) observer.observe(target);
}
