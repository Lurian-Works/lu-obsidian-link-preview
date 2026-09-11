import type { ConfigManager } from "./config/link-card-config"
import type { DataManager, InlineLinkParser } from "./data-manager"
import type { OpenService } from "./open-service"
import { errorEl, linkCard } from "./presentation"
import { type DvLink, type LinkInputObject, LinkObjectSchema } from "./schema"
import { getTextNodes } from "./utils/dom-helper"
import { LuLinkError } from "./utils/helper"
import type { PathUtils } from "./utils/path-helper"

export class LinkCardService {
  constructor(
    private readonly deps: {
      readonly linkParser: InlineLinkParser
      readonly pathUtils: PathUtils
      readonly dataManager: DataManager
      readonly openService?: OpenService
      readonly settings: ConfigManager
    },
  ) {}
  handleClick(event: PointerEvent, path: string) {
    if (event.button === 0) {
      this.deps.openService?.open(path)
    }
  }
  async linkCard(input: LinkInputObject | string, inline?: boolean) {
    try {
      if (typeof input === "string") {
        const cardWrapper = createEl("div")
        if (inline) {
          cardWrapper.classList.add("lu-lc-inline-wrapper")
        }
        try {
          const data = await this.deps.dataManager.getLinkData(input)
          cardWrapper.appendChild(
            linkCard({
              data,
              onClick: this.deps.openService ? this.handleClick : undefined,
              settings: this.deps.settings.data,
            }),
          )
        } catch (e) {
          cardWrapper.appendChild(errorEl(`LinkCard failed`))
          console.error(e)
        }
        return cardWrapper
      }
      const parsedFull = LinkObjectSchema.safeParse(input)

      if (parsedFull.success) {
        return linkCard({
          data: parsedFull.data,
          onClick: this.deps.openService ? this.handleClick : undefined,
          settings: this.deps.settings.data,
        })
      }
      const data = await this.deps.dataManager.getLinkData(input.path)
      return linkCard({
        data: {
          path: data.path,
          hostname: input.hostname || data.hostname,
          title: input.title || data.title,
          description: input.description || data.description,
          image: input.image || data.image,
        },
        onClick: this.deps.openService ? this.handleClick : undefined,
        settings: this.deps.settings.data,
      })
    } catch (e) {
      throw new LuLinkError(`failed creating link card`, { cause: e })
    }
  }
  async renderCardBlock(text: string) {
    const blockWrapper = createEl("div", { cls: "lc-block-wrapper" })

    try {
      const settings = this.deps.settings.data
      const linkObjects = await this.deps.dataManager.getBlockData(text)
      linkObjects.forEach(link => {
        const card = linkCard({
          data: link,
          onClick: this.deps.openService ? this.handleClick : undefined,
          settings,
        })
        blockWrapper.appendChild(card)
      })
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
  async renderInlineLinks(element: HTMLElement) {
    const textNodes = getTextNodes(element)
    for (const node of textNodes) {
      const text = node.nodeValue
      if (!text) return

      const linkSections = [...this.deps.linkParser.findLinkSections(text)]
      if (!linkSections.length) return

      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      for (const linkMatch of linkSections) {
        const fullMatch = linkMatch[0]
        const rawValue = linkMatch[1]
        const startIndex = linkMatch.index ?? 0

        if (rawValue) {
          const before = text.slice(lastIndex, startIndex)
          if (before) {
            fragment.appendChild(document.createTextNode(before))
          }
          const v = this.deps.linkParser.getLinkValues(rawValue)
          v.forEach(async inputLink => {
            const cardWrapper = createEl("div", { cls: "lu-lc-inline-wrapper" })
            fragment.appendChild(cardWrapper)
            try {
              const data = await this.deps.dataManager.getLinkData(inputLink)
              cardWrapper.appendChild(
                linkCard({
                  data,
                  onClick: this.handleClick,
                  settings: this.deps.settings.data,
                }),
              )
            } catch (e) {
              cardWrapper.appendChild(errorEl(`LinkCard failed`))
              console.error(e)
            }

            lastIndex = startIndex + fullMatch.length
          })
        }
      } /*
      const after = text.slice(lastIndex)
      if (after) {
        fragment.appendChild(document.createTextNode(after))
      }*/
      node.parentNode?.replaceChild(fragment, node)
    }
  }

  parseYamlInput(yamlValue: string | string[] | DvLink | DvLink[]): string[] {
    if (Array.isArray(yamlValue)) {
      return yamlValue.map(val => {
        return this.deps.pathUtils.resolveYamlPath(val)
      })
    }
    return [this.deps.pathUtils.resolveYamlPath(yamlValue)]
  }

  async yamlValToCardblock(yamlVal: unknown) {
    if (!yamlVal) return
    if (typeof yamlVal === "string" || isDvLink(yamlVal)) {
      const paths = this.parseYamlInput(yamlVal)
      const cardWrapper = createEl("div", { cls: "lc-block-wrapper" })
      for (const p of paths) {
        const card = await this.linkCard(p)
        cardWrapper.appendChild(card)
      }
      return cardWrapper
    } else {
      throw new LuLinkError(`invalid input`)
    }
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
