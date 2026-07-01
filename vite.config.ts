import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "package.json"), "utf-8"),
);

const gitCommit = (() => {
  // Read VITE_GIT_COMMIT from env first (CI/Dokploy can inject it cheaply),
  // then fall back to invoking git locally — silenced so the build log isn't
  // polluted on machines (Alpine, etc.) without git installed.
  if (process.env.VITE_GIT_COMMIT) return process.env.VITE_GIT_COMMIT;
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
})();

// Auto-incrementing build number: the git commit count. It grows by one on
// every commit with zero manual bookkeeping and never mutates a tracked file.
// CI can override via VITE_BUILD_NUMBER; falls back to "0" without git.
const buildNumber = (() => {
  if (process.env.VITE_BUILD_NUMBER) return process.env.VITE_BUILD_NUMBER;
  try {
    return execSync("git rev-list --count HEAD", {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "0";
  }
})();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: true,
  },
  build: {
    sourcemap: mode === "development",
  },
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version ?? "0.0.0"),
    __APP_COMMIT__: JSON.stringify(gitCommit),
    __APP_BUILD_NUMBER__: JSON.stringify(buildNumber),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
}));
