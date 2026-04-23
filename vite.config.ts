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
  try {
    return execSync("git rev-parse --short HEAD", { cwd: __dirname })
      .toString()
      .trim();
  } catch {
    return "dev";
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
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
}));
