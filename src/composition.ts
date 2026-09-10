import os from "node:os"
import { DataManager } from "./data-manager"
import type LuLinkPreviewPlugin from "./main"
import { ObsidianCardService } from "./obsidian-adapter"
import { LinkCardFactory } from "./presentation"

export class PluginRoot {
  cardFactory
  obsidianAdapter
  constructor(plugin: LuLinkPreviewPlugin) {
    const currentPlatform = os.platform()
    const dataManager = new DataManager()
    this.cardFactory = new LinkCardFactory(dataManager)
    this.obsidianAdapter = new ObsidianCardService(plugin, this.cardFactory)
  }
}
