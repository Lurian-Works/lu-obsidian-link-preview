import type { ConfigManager } from "./config/link-card-config"
import type { DataManager } from "./data-manager"
import type { OpenService } from "./filesystem/open-service"
import type { LinkCardService } from "./link-card-service"
import type { CardBlockOptions, DvLink, LinkInputObject } from "./schema"
import { luDebugger } from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"

export class PublicApi {
  /**
   * can return undefined if the yaml value is undefined, so be sure to check it before appending
   * @param yamlValue can be one of the following:
   * 1. absolute path,
   * 2. vault path,
   * 3. file/web-url,
   * 4. wiki or markdown link containing any of the previous
   * 5. an object containing { path: string } where path can be any of the previous, this does not support settings because it is build to support dataviews link objects
   * 6: an array containing any of the previous
   * @returns a link card block or undefined if the yaml value is undefined.
   */
  yamlCard: (
    yamlValue: string | DvLink | (string | DvLink)[],
  ) => Promise<HTMLElement | undefined>

  constructor(private readonly cardService: LinkCardService) {
    this.yamlCard = cardService.yamlValToCardblock
  }
  /**
   * get a linkCard or block, automatically adds image description etc for a web urls
   * manually setting an option when using LinkObject as input will overwrite the generated info
   * @param path can be one of the following:
   * 1. absolute path,
   * 2. vault path,
   * 3. file/web-url,
   * 4. wiki or markdown link containing any of the previous
   * 5. an object containing { path: string } where path can be any of the previous,supports optional settings
   * 6. an array containing any of the previous
   * @returns a Link Card or a Link Card Block if path is an array
   */
  async linkCard(path: string | LinkInputObject) {
    return this.cardService.linkCard(path)
  }

  /**
   *
   * @param links same as {@link PublicApi.linkCard} just as array
   * @returns cardBlock container
   */
  async linkBlock(
    links: (LinkInputObject | string)[],
    options?: CardBlockOptions,
  ) {
    return this.cardService.cardBlock(links, options)
  }
}

/**
 * grants access the most important classes. For now this is just a direct connection to the internal classes for developing and not optimized as a user api.
 * That said, i think if you know a little bit about js at least the openService can be nice to have
 */
export class DevApi {
  config?: ConfigManager
  pathHelper?: typeof pathHelper
  pathUtils?: PathUtils
  openService?: OpenService
  dataManager?: DataManager
  debug?: typeof luDebugger

  constructor(
    private readonly __config: ConfigManager,
    private readonly __pathUtils: PathUtils,
    private readonly __dataManager: DataManager,
    private readonly __openService?: OpenService,
  ) {}

  clearCache = async () => {
    await this.__dataManager.clearCache()
  }

  activate() {
    this.debug = luDebugger
    this.dataManager = this.__dataManager
    this.config = this.__config
    this.pathHelper = pathHelper
    this.pathUtils = this.__pathUtils
    this.openService = this.__openService
    console.log(`LuLink: activated DevApi`)
  }

  deactivate() {
    this.debug = undefined
    this.dataManager = undefined
    this.config = undefined
    this.pathHelper = undefined
    this.pathUtils = undefined
    this.openService = undefined
    console.log(`LuLink: deactivated DevApi`)
  }

  enableDebug = (namespace?: string) => {
    luDebugger.enable(namespace ? namespace : "LuLink:*")
  }
}
