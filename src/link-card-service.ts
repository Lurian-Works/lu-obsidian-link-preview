import type { ConfigManager } from "./config/link-card-config"
import type { DataManager, InlineLinkParser } from "./data-manager"
import type { OpenService } from "./filesystem/open-service"
import { errorEl, linkCard } from "./presentation"
import {
  type CardBlockOptions,
  type DvLink,
  type LinkInputObject,
  LinkObjectSchema,
  URLSchema,
  WebURLSchema,
} from "./schema"
import { getTextNodes } from "./utils/dom-helper"
import { LuLinkError, luDebug } from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"

const lcsDebug = luDebug("LinkCardService")

export class LinkCardService {
  constructor(
    private readonly deps: {
      readonly linkParser: InlineLinkParser
      readonly pathUtils: PathUtils
      readonly dataManager: DataManager
      readonly openService?: OpenService
      readonly settings: ConfigManager
    },
  ) {
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick = (event: PointerEvent, path: string) => {
    if (!this.deps.openService) throw new Error(`open service is not defined`)
    if (event.button === 0) {
      this.deps.openService?.open(path)
    }
  }

  linkCard = async (input: LinkInputObject | string) => {
    const fooDebug = lcsDebug.extend(`linkCard`)
    fooDebug(`input: ${input}`)

    if (typeof input === "string") {
      const parsedPath = URLSchema.safeParse(input)
        ? input
        : this.deps.pathUtils.toVaultPath(pathHelper.normalize(input))
      const data = await this.deps.dataManager.getLinkData(parsedPath)
      fooDebug(`data:`, data)
      return linkCard({
        data,
        onClick: this.deps.openService ? this.handleClick : undefined,
        settings: this.deps.settings.data,
      })
    }

    const parsedFull = LinkObjectSchema.safeParse(input)
    fooDebug("parsedFull", parsedFull)

    if (parsedFull.success) {
      fooDebug(`data:`, parsedFull.data)
      return linkCard({
        data: parsedFull.data,
        onClick: this.deps.openService ? this.handleClick : undefined,
        settings: this.deps.settings.data,
      })
    }

    const data = await this.deps.dataManager.getLinkData(
      pathHelper.normalize(input.path),
    )
    fooDebug("data", data)
    return linkCard({
      data: {
        path: data.path,
        hostname: input.hostname || data.hostname,
        title: input.title || data.title,
        description: input.description || data.description,
        image: input.image || data.image,
        display: input.display,
      },
      onClick: this.deps.openService ? this.handleClick : undefined,
      settings: this.deps.settings.data,
    })
  }

  codeblockCardBlock = async (text: string) => {
    try {
      const parsedText = await this.deps.dataManager.getBlockData(text)
      return this.cardBlock(parsedText.links, parsedText.blockOptions)
    } catch (error) {
      console.error("Link preview failed:", error)
      return errorEl("Link preview failed")
    }
  }

  cardBlock = async (
    links: (LinkInputObject | string)[],
    options?: CardBlockOptions,
  ) => {
    const blockWrapper = createEl("div", { cls: "lc-block-wrapper" })
    try {
      if (options?.display === "inline") {
        blockWrapper.classList.add("lu-lc-inline-wrapper")
      }
      if (options?.display === "quad") {
        blockWrapper.classList.add("lu-lc-quad-wrapper")
      }

      if (Array.isArray(links)) {
        for (const link of links) {
          const card = await this.linkCard(link)
          blockWrapper.appendChild(card)
        }
      } else {
        const card = await this.linkCard(links)
        blockWrapper.appendChild(card)
      }
    } catch (error) {
      blockWrapper.appendChild(errorEl("Link preview failed"))
      console.error("Link preview failed:", error)
    }
    return blockWrapper
  }

  /**
   * replace all inlineLinkCard identifier with linkCards
   * @param element the element to serach in - can be any dom element
   */
  renderInlineLinks = async (element: HTMLElement) => {
    const fooDebug = lcsDebug.extend("renderInlineLinks")
    let i = 0
    const textNodes = getTextNodes(element)
    for (const node of textNodes) {
      i++
      const text = node.nodeValue
      fooDebug(`TextNode${i}`, text)
      if (!text) continue

      const linkSections = [...this.deps.linkParser.findLinkSections(text)]
      if (!linkSections.length) continue

      fooDebug(`linkSections${i}`, linkSections)

      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      let LinkMatchI = 0
      for (const linkMatch of linkSections) {
        LinkMatchI++
        const fullMatch = linkMatch[0]
        const rawValue = linkMatch[1]
        const startIndex = linkMatch.index ?? 0

        fooDebug(`linkMatch${LinkMatchI}`, linkMatch)

        if (rawValue) {
          const before = text.slice(lastIndex, startIndex)
          if (before) {
            fragment.appendChild(document.createTextNode(before))
          }
          const v = this.deps.linkParser.getLinkValues(rawValue)
          fooDebug(`v(linkValues)${LinkMatchI}`, v)

          for (const inputLink of v) {
            const cardWrapper = createEl("div", { cls: "lu-lc-inline" })
            fragment.appendChild(cardWrapper)
            try {
              const data = await this.deps.dataManager.getLinkData(
                inputLink.path,
              )
              cardWrapper.appendChild(
                linkCard({
                  data: {
                    ...data,
                    title: inputLink.name || data.title,
                  },
                  onClick: this.deps.openService ? this.handleClick : undefined,
                  settings: this.deps.settings.data,
                }),
              )
            } catch (e) {
              cardWrapper.appendChild(errorEl(`LinkCard failed`))
              console.error(e)
            }
            lastIndex = startIndex + fullMatch.length
          }
        }
      }
      const after = text.slice(lastIndex)
      if (after) {
        fragment.appendChild(document.createTextNode(after))
      }
      node.parentNode?.replaceChild(fragment, node)
    }
  }

  yamlValToCardblock = async (yamlVal: unknown, options?: CardBlockOptions) => {
    try {
      const paths = this.parseYamlVal(yamlVal)
      return this.cardBlock(paths, options)
    } catch (e) {
      return errorEl(`failed rendering yamlCardBlock`, { cause: e })
    }
  }

  private parseYamlVal = (yamlValue: unknown): string[] => {
    const valid = this.validateYamlInput(yamlValue)
    if (Array.isArray(valid)) {
      return valid.map(val => {
        if (WebURLSchema.safeParse(val).success) return val as string
        return this.deps.pathUtils.resolveYamlPath(val)
      })
    }
    return WebURLSchema.safeParse(valid).success
      ? ([valid] as string[])
      : [this.deps.pathUtils.resolveYamlPath(valid)]
  }

  private validateYamlInput(value: unknown) {
    if (typeof value === "string") return value
    if (isDvLink(value)) return value
    if (Array.isArray(value)) {
      for (const val of value) {
        if (!(typeof val === "string") && !isDvLink(val))
          throw new LuLinkError(`invalid yaml input`)
      }
      return value as string[] | DvLink[]
    }
    throw new LuLinkError(`invalid yaml input`)
  }

  clearCache = async () => {
    this.deps.dataManager.clearCache()
  }
}

export function isDvLink(value: unknown): value is DvLink {
  if (!value) return false
  return (
    typeof value === "string"
    || (typeof value === "object"
      && value !== null
      && "path" in value
      && typeof value.path === "string")
  )
}
