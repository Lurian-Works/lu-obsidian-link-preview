import type { DataManager } from "./data-manager"
import { errorEl, linkCard, linkCard, linkCardLoadingEl } from "./presentation"
import type { OgpStore } from "./repository/indexed-db-store"
import type { LinkObject } from "./schema"
import type { InlineLinkParser, linkBlockParser } from "./src/link-text-parser"
import { getTextNodes } from "./utils/dom-helper"
import type { PathUtils } from "./utils/path-helper"

export class linkCardService {
  constructor(
    private readonly deps: {
      readonly pathUtils: PathUtils
      readonly ogpStore: OgpStore
      readonly blockParser: typeof linkBlockParser
      readonly linkParser: InlineLinkParser
      readonly dataManager: DataManager
      readonly openService: 
    },
  ) {}
  async renderCardBlock(text: string) {
    try {

      const linkObjects = await this.deps.dataManager.getBlockData(text)
      linkObjects.forEach(link => {
        
        const card = linkCard({data: link, onClick:})
      });
    } catch (error) {
      wrapper.appendChild(errorEl("Could not load link preview."))
      console.error("Link preview failed:", error)
    }
  }
  async renderInlineLinks(
    element: HTMLElement,
    render: (
      container: HTMLDivElement,
      value: string[] | undefined,
    ) => void | Promise<void>,
  ) {
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
          const v = this.deps.linkParser.getLinkValues(rawValue)
          v.forEach(async inputLink => {
            const data = await this.deps.dataManager.getLinkData(inputLink)
            const container = createEl("div")
            container.classList.add("lu-lc-inline-container")

            const before = text.slice(lastIndex, startIndex)
            if (before) {
              fragment.appendChild(document.createTextNode(before))
            }

            fragment.appendChild(container)
            await render(container, data)

            lastIndex = startIndex + fullMatch.length
          })
        }
      }
      const after = text.slice(lastIndex)
      if (after) {
        fragment.appendChild(document.createTextNode(after))
      }
      node.parentNode?.replaceChild(fragment, node)
    }
  }
}
