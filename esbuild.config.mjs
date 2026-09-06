import esbuild from "esbuild"

esbuild
  .build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    outfile: "main.js",
    external: ["obsidian"],
    format: "cjs",
    sourcemap: true,
    minify: true,
  })
  .catch(() => process.exit(1))
