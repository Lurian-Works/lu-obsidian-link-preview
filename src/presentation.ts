import type { LuLinkCardManager } from "./data-layer"
import type { LinkCardSettings, OgpData } from "./schema"

export class LinkCardFactory {
  constructor(
    private readonly dataManager: LuLinkCardManager,
    settings?: () => LinkCardSettings,
  ) {}

  async renderLinkCard(wrapper: HTMLElement, url: string) {
    wrapper.empty()
    wrapper.appendChild(linkCardLoadingEl())
    try {
      const data = await this.dataManager.getOpenGraphData(url)
      wrapper.empty()
      wrapper.appendChild(linkCard(data))
    } catch (error) {
      wrapper.appendChild(errorEl("Could not load link preview."))
      console.error("Link preview failed:", error)
    }
  }
}

export function errorEl(message: string) {
  return createEl("div", {
    text: message,
    cls: "lu-lc-error",
  })
}

function linkCardLoadingEl() {
  return createEl("div", {
    text: "Loading preview...",
    cls: "lu-lc-loading",
  })
}

function linkCard(data: OgpData) {
  const card = createEl("a", {
    cls: "lu-lc-card",
    attr: {
      href: data.url,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  })

  if (data.image) {
    card.createEl("img", {
      cls: "lu-lc-image",
      attr: {
        src: data.image,
        alt: "",
      },
    })
  }

  const content = card.createEl("div", {
    cls: "lu-lc-content",
  })

  content.createEl("div", {
    text: data.title || data.url,
    cls: "lu-lc-title",
  })

  if (data.description) {
    content.createEl("div", {
      text: data.description,
      cls: "lu-lc-description",
    })
  }

  content.createEl("div", {
    text: data.siteName || new URL(data.url).hostname,
    cls: "lu-lc-site",
  })

  return card
}

function fileCard(data: OgpData) {
  const card = createEl("a", {
    cls: "lu-lc-card",
    attr: {
      href: data.url,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  })

  if (data.image) {
    card.createEl("img", {
      cls: "lu-lc-image",
      attr: {
        src: data.image,
        alt: "",
      },
    })
  }

  const content = card.createEl("div", {
    cls: "lu-lc-content",
  })

  content.createEl("div", {
    text: data.title || data.url,
    cls: "lu-lc-title",
  })

  if (data.description) {
    content.createEl("div", {
      text: data.description,
      cls: "lu-lc-description",
    })
  }

  content.createEl("div", {
    text: data.siteName || new URL(data.url).hostname,
    cls: "lu-lc-site",
  })

  return card
}
