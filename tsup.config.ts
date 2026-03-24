import { defineConfig } from "tsup";

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: {
      index: "src/index.ts"
    },
    format: ["cjs"],
    outDir: "dist",
    sourcemap: false,
    target: "node22"
  },
  {
    clean: false,
    dts: false,
    entry: {
      cli: "src/cli/index.ts"
    },
    format: ["cjs"],
    outDir: "dist",
    sourcemap: false,
    target: "node22",
    banner: {
      js: "#!/usr/bin/env node"
    }
  }
]);
