import esbuild from "esbuild";

const prod = process.argv.includes("--production");

esbuild.build({
  entryPoints: ["main.ts"],
  bundle: true,
  outfile: "main.js",
  external: ["obsidian"],
  format: "cjs",
  sourcemap: !prod,
  minify: prod
}).catch(() => process.exit(1));