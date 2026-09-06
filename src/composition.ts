import { DataManager } from "./data-layer"
import type LuLinkPreviewPlugin from "./main"
import { ObsidianAdapter } from "./obsidian-adapter"
import { LinkCardFactory } from "./presentation"

export class PluginRoot {
  cardFactory
  obsidianAdapter
  constructor(plugin: LuLinkPreviewPlugin) {
    const dataManager = new DataManager()
    this.cardFactory = new LinkCardFactory(dataManager)
    this.obsidianAdapter = new ObsidianAdapter(plugin, this.cardFactory)
  }
}
