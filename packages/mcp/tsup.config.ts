import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node18",
  bundle: true,
  // Inline the shared engine (raw TS) into the bundle; keep the SDK + zod as external
  // installed deps.
  noExternal: ["@vibesafely/scan-core"],
  banner: { js: "#!/usr/bin/env node" },
  clean: true,
  sourcemap: true,
  dts: false,
});
