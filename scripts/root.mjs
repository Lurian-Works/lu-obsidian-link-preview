import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { getBuildData } from "./data.mjs"
import { paths } from "./private-data.mjs"

const buildData = getBuildData()

export function runNpm(command) {
  execSync(`npm run ${command}`, { stdio: "inherit" })
}

export function runBuild() {
  runNpm("build")
}

export function buildDist() {
  console.log("started")
  runBuild()
  const buildDir = buildData.distDir.build
  fs.rmSync(buildDir, {
    recursive: true,
    force: true,
  })

  fs.mkdirSync(buildDir, { recursive: true })

  const includeFiles = [
    "main.js",
    "manifest.json",
    path.join("src", "styles.css"),
    "README.md",
    "LICENSE.md",
  ]

  let writeSuccess = 0

  for (const file of includeFiles) {
    const originPath = path.join(buildData.dirRoot, file)
    const distFile = path.join(buildDir, path.basename(file))
    if (fs.existsSync(originPath)) {
      fs.copyFileSync(originPath, distFile)
      if (fs.existsSync(distFile)) {
        writeSuccess = writeSuccess ? writeSuccess + 1 : 1
      }
    }
  }
  console.log(
    `finished. ${writeSuccess} of ${includeFiles.length} files were successfully written to dist`,
  )
}

export function copyBuildDistDir(targetDir) {
  const originDistDir = buildData.distDir.build

  if (fs.existsSync(originDistDir)) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    fs.cpSync(originDistDir, targetDir, { recursive: true })
  } else {
    console.log("no origin dist folder found")
  }
}

export function buildDevVault() {
  const targetDir = path.join(
    paths.devVault,
    `.obsidian/plugins`,
    buildData.pluginId,
  )
  runBuild()
  buildDist()
  copyBuildDistDir(targetDir)
}

export function prepareRelease() {
  // runNpm("lint")
  runNpm("typecheck")
  buildDist()
  //runNpm("test")
  runNpm("docs")
  buildDevVault()
}

/**
 *
 * @param {string} kind "patch", "minor", "major"
 */
export function makeRelease(kind) {
  const newVersion = bumpVersion(buildData.version, kind)

  const manifestData = buildData.manifest
  manifestData.version = newVersion
  fs.writeFileSync(
    path.join(buildData.dirRoot, `manifest.json`),
    JSON.stringify(manifestData, null, 2),
  )
  prepareRelease()

  const releaseDir = path.join(
    buildData.distDir.releaseRoot,
    newVersion.replaceAll(".", "-"),
  )

  const zipPath = path.join(
    buildData.distDir.releaseRoot,
    `${pluginId}-v${newVersion}.zip`,
  )

  fs.mkdirSync(releaseDir, {
    recursive: true,
  })

  execSync(
    `powershell Compress-Archive -Path "${buildData.distDir.build}" -DestinationPath "${zipPath}"`,
    {
      stdio: "inherit",
    },
  )

  console.log(`Created ${zipPath}`)
}

/**
 * @param {string} kind "patch", "minor", "major"
 */
function bumpVersion(version, kind) {
  const releaseCommands = ["patch", "minor", "major"]
  const kindParsed = kind.trim().toLowerCase()

  if (releaseCommands.includes(kindParsed)) {
    const [major, minor, patch] = version.split(".").map(Number)

    switch (kindParsed) {
      case "major":
        return `${major + 1}.0.0`

      case "minor":
        return `${major}.${minor + 1}.0`

      case "patch":
        return `${major}.${minor}.${patch + 1}`
    }
  } else
    throw new Error(
      `invalid release kind - options are: ${releaseCommands.join(", ")}`,
    )
}
