import type { DataManager } from "./data-layer"
import type { OgpData } from "./schema"

export class LinkCardFactory {
  constructor(private readonly dataManager: DataManager) {}
  replaceInlinePreviewSyntax(node: Text) {
    const text = node.nodeValue
    if (!text) return

    const regex = /\[\(lu-link-prev:\s*(https?:\/\/[^\s)]+)\s*\)\]/gi
    const matches = [...text.matchAll(regex)]

    if (!matches.length) return

    const fragment = document.createDocumentFragment()
    let lastIndex = 0

    for (const match of matches) {
      const fullMatch = match[0]
      const url = match[1]
      const start = match.index ?? 0

      const before = text.slice(lastIndex, start)
      if (before) {
        fragment.appendChild(document.createTextNode(before))
      }

      const container = createEl("span")
      container.classList.add("lu-lp-inline-container")

      fragment.appendChild(container)
      this.renderPreview(container, url)

      lastIndex = start + fullMatch.length
    }

    const after = text.slice(lastIndex)
    if (after) {
      fragment.appendChild(document.createTextNode(after))
    }

    node.parentNode?.replaceChild(fragment, node)
  }

  async renderPreview(el: HTMLElement, url: string) {
    el.empty()

    el.createEl("div", {
      text: "Loading preview...",
      cls: "lu-lp-loading",
    })

    try {
      const data = await this.dataManager.getOpenGraphData(url)
      el.empty()
      this.renderCard(el, data)
    } catch (error) {
      this.renderError(el, "Could not load link preview.")
      console.error("Link preview failed:", error)
    }
  }

  renderError(el: HTMLElement, message: string) {
    el.empty()

    el.createEl("div", {
      text: message,
      cls: "lu-lp-error",
    })
  }

  renderCard(el: HTMLElement, data: OgpData) {
    const card = el.createEl("a", {
      cls: "lu-lp-card",
      attr: {
        href: data.url,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    })

    if (data.image) {
      card.createEl("img", {
        cls: "lu-lp-image",
        attr: {
          src: data.image,
          alt: "",
        },
      })
    }

    const content = card.createEl("div", {
      cls: "lu-lp-content",
    })

    content.createEl("div", {
      text: data.title || data.url,
      cls: "lu-lp-title",
    })

    if (data.description) {
      content.createEl("div", {
        text: data.description,
        cls: "lu-lp-description",
      })
    }

    content.createEl("div", {
      text: data.siteName || new URL(data.url).hostname,
      cls: "lu-lp-site",
    })
  }
}

export class LinkCard {
  constructor(private readonly dataManager: DataManager) {}

  async renderPreview(el: HTMLElement, url: string) {
    el.empty()

    el.createEl("div", {
      text: "Loading preview...",
      cls: "lu-lp-loading",
    })

    try {
      const data = await this.dataManager.getOpenGraphData(url)
      el.empty()
      el.appendChild(linkCard(data))
    } catch (error) {
      el.appendChild(this.errorEl("Could not load link preview."))
      console.error("Link preview failed:", error)
    }
  }

  errorEl(message: string) {
    return createEl("div", {
      text: message,
      cls: "lu-lp-error",
    })
  }
}

export function linkCard(data: OgpData) {
  const card = createEl("a", {
    cls: "lu-lp-card",
    attr: {
      href: data.url,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  })

  if (data.image) {
    card.createEl("img", {
      cls: "lu-lp-image",
      attr: {
        src: data.image,
        alt: "",
      },
    })
  }

  const content = card.createEl("div", {
    cls: "lu-lp-content",
  })

  content.createEl("div", {
    text: data.title || data.url,
    cls: "lu-lp-title",
  })

  if (data.description) {
    content.createEl("div", {
      text: data.description,
      cls: "lu-lp-description",
    })
  }

  content.createEl("div", {
    text: data.siteName || new URL(data.url).hostname,
    cls: "lu-lp-site",
  })

  return card
}
