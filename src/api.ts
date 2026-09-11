import type { ConfigManager } from "./config/link-card-config"
import type { DataManager } from "./data-manager"
import type { LinkCardService } from "./link-card-service"
import type { OpenService } from "./open-service"
import type { DvLink, LinkInputObject } from "./schema"
import type { PathUtils } from "./utils/path-helper"

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
    yamlValue: string | string[] | DvLink | DvLink[],
  ) => Promise<HTMLElement | undefined>

  constructor(private readonly cardService: LinkCardService) {
    this.yamlCard = cardService.yamlValToCardblock
  }
  /**
   * get alinkCard or block, automatically adds image description etc for a web urls
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
  async linkCard(
    path: string | LinkInputObject | (string | LinkInputObject)[],
  ) {
    if (Array.isArray(path)) {
      const wrapper = createEl("div", { cls: `lc-block-wrapper` })
      for (const p of path) {
        const card = await this.cardService.linkCard(p)
        wrapper.appendChild(card)
      }
      return wrapper
    }
    return this.cardService.linkCard(path)
  }
}

/**
 * grants access the most important classes. For now this is just a direct connection to the internal classes for developing and not optimized as a user api.
 * That said, i think if you know a little bit about js at least the openService can be nice to have
 */
export class DevApi {
  config?: ConfigManager
  parser?: DataManager
  pathUtils?: PathUtils
  openService?: OpenService
  constructor(
    private readonly __config: ConfigManager,
    private readonly __parser: DataManager,
    private readonly __pathUtils: PathUtils,
    private readonly __openService?: OpenService,
  ) {}
  activate() {
    this.config = this.__config
    this.parser = this.__parser
    this.pathUtils = this.__pathUtils
    this.openService = this.__openService
    console.log(`LuLink: activated DevApi`)
  }
  deactivate() {
    this.config = undefined
    this.parser = undefined
    this.pathUtils = undefined
    this.openService = undefined
    console.log(`LuLink: deactivated DevApi`)
  }
}
