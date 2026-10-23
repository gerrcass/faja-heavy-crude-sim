import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/faja-heavy-crude-sim/",
  build: {
    target: "es2020",
    assetsInlineLimit: 2048,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
