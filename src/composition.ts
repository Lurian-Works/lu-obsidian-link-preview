import os from "node:os"
import { requestUrl } from "obsidian"
import { DevApi, PublicApi } from "./api"
import { ConfigManager } from "./config/link-card-config"
import { DataManager, InlineLinkParser, linkBlockParser } from "./data-manager"
import { ElectronAdapter } from "./environment/electron-adapter"
import {
  ObsidianAdapter,
  ObsidianCardLink,
} from "./environment/obsidian-adapter"
import { LinkCardService } from "./link-card-service"
import type LuLinkPreviewPlugin from "./main"
import { OpenService } from "./open-service"
import { LuLinkDb, OgpStore } from "./repository/indexed-db-store"
import { JsonStore } from "./repository/json-store"
import { PathUtils } from "./utils/path-helper"

export class PathRoot {
  pluginRoot
  storageRoot
  constructor(
    private readonly vaultRoot: string,
    pluginId: string,
  ) {
    this.pluginRoot = `${this.vaultRoot}/.obsidian/plugins/${pluginId}`
    this.storageRoot = `${this.pluginRoot}/storage`
  }
}

export class PluginComposition {
  publicApi!: PublicApi
  devApi?: DevApi

  private config!: ConfigManager
  private openService?: OpenService
  private dataManager!: DataManager
  private pathUtils!: PathUtils

  constructor(private readonly plugin: LuLinkPreviewPlugin) {}
  async init() {
    const currentPlatform = os.platform()
    const obsidian = new ObsidianAdapter(this.plugin.app)
    const electronAdapter = new ElectronAdapter()

    const pluginId = this.plugin.manifest.id
    const pathRoot = new PathRoot(obsidian.vaultRoot, pluginId)

    const db = new LuLinkDb()
    const ogpStore = new OgpStore(db)

    const jsonStore = await JsonStore.init(pathRoot.storageRoot)
    this.config = await ConfigManager.init(jsonStore, `settings`)

    this.pathUtils = new PathUtils(obsidian.vaultRoot)
    const blockParser = linkBlockParser
    const inlineParser = new InlineLinkParser("LuLink")

    this.dataManager = new DataManager({
      pathUtils: this.pathUtils,
      ogpStore,
      blockParser,
      inlineParser: inlineParser,
      requestUrl: requestUrl,
    })

    this.openService =
      this.config.data.allowOutsideVault === true
        ? new OpenService({
            obsidian,
            electron: electronAdapter.getElectronShell(),
            pathUtils: this.pathUtils,
            platform: currentPlatform,
          })
        : undefined

    const linkCardService = new LinkCardService({
      linkParser: inlineParser,
      pathUtils: this.pathUtils,
      dataManager: this.dataManager,
      openService: this.openService,
      settings: this.config,
    })
    const obsidianCardLink = new ObsidianCardLink(
      this.plugin,
      linkCardService,
      "LuLink",
    )

    this.publicApi = new PublicApi(linkCardService)
    if (this.config.data.enableDevApi) this.createDevApi()

    await this.registerCommands(obsidianCardLink)

    return this
  }

  createDevApi() {
    if (this.devApi) return
    this.devApi = new DevApi(
      this.config,
      this.dataManager,
      this.pathUtils,
      this.openService,
    )
    this.devApi.activate()
  }

  async registerCommands(obsidianCardLink: ObsidianCardLink) {
    try {
      obsidianCardLink.registerCodeBlockPreview()
      obsidianCardLink.registerInlinePreview()
      obsidianCardLink.registerCommands()
    } catch (e) {
      console.error(`LuLink: failed to register commands`, { cause: e })
    }
  }
}
