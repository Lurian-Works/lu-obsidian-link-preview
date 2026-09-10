import { Plugin } from "obsidian"
import { PluginComposition } from "./composition"

export default class LuLinkPreviewPlugin extends Plugin {
  async onload() {
    console.log(`LuLink: loading plugin...`)
    try {
      const LuLink = await new PluginComposition(this).init()

      console.log("Lu Link Preview: plugin loaded")
    } catch (e) {
      throw new Error(`LuLink: failed loading plugin`, { cause: e })
    }
  }
}
