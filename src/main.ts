import { Plugin } from "obsidian"
import { PluginRoot } from "./composition"

export default class LuLinkPreviewPlugin extends Plugin {
  async onload() {
    const modules = new PluginRoot(this)
    modules.obsidianAdapter.registerCodeBlockPreview()
    modules.obsidianAdapter.registerInlinePreview()
    modules.obsidianAdapter.registerCommands()
    console.log("Lu Link Preview: plugin loaded")
  }
}
