import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { realpathSync } from "node:fs";
import path from "node:path";

// Bun may link dependencies outside the project folder; Vitest still needs to read their font assets.
const nodeModules = realpathSync(path.resolve(__dirname, "node_modules"));

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [path.resolve(__dirname), nodeModules] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
