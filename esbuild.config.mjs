import esbuild from "esbuild"

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "main.js",
    external: ["obsidian"],
    format: "cjs",
    platform: "node",
    sourcemap: true,
    minify: false,
  })
  .catch(() => process.exit(1))
