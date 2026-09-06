import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export function getBuildData() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const dirRoot = path.join(__dirname, "..")
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dirRoot, `manifest.json`), "utf-8"),
  )
  const distDir = path.join(dirRoot, "dist")
  const buildDir = path.join(distDir, manifest.id)

  const releaseRoot = path.join(distDir, "releases")

  return {
    manifest,
    pluginId: manifest.id,
    version: manifest.version,
    dirRoot,
    distDir: {
      root: distDir,
      build: buildDir,
      releaseRoot,
    },
  }
}
