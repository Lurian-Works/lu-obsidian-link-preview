import {
  buildDevVault,
  buildDist,
  makeRelease,
  prepareRelease,
} from "./root.mjs"

const commands = {
  buildDist,
  buildDevVault,
  prepareRelease,
  makeRelease,
}

const commandId = process.argv[2]

console.log(commandId)
// run for example with "node scripts/root.js makeRelease patch"
// or "npm run release -- patch"
if (commandId === "makeRelease") {
  const kind = process.argv[3]
  commands[commandId]?.(kind)
} else {
  commands[commandId]?.()
}
