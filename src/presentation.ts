import type { LinkCardSettings } from "./config/link-card-config"
import type { LinkObject } from "./schema"

export function errorEl(message: string) {
  return createEl("div", {
    text: message,
    cls: "lu-lc-error",
  })
}

export function linkCardLoadingEl() {
  return createEl("div", {
    text: "Loading preview...",
    cls: "lu-lc-loading",
  })
}

/**
 * @param onClick if onClick is defined, automatic openniing via anchor and href is not applied
 * without settings it falls back to a simple html anchor element with an href attribute
 *
 */
export function linkCard(options: {
  data: LinkObject
  onClick?: (event: PointerEvent, path: string) => void | Promise<void>
  settings?: LinkCardSettings
}) {
  let card: HTMLElement
  if (options.settings?.allowOutsideVault === true && options.onClick) {
    card = createEl("div", {
      cls: "lu-lc-card",
    })
    card.addEventListener("click", e => {
      options.onClick?.(e, options.data.path)
    })
  } else {
    card = createEl("a", {
      cls: "lu-lc-card",
      attr: {
        href: options.data.path,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    })
  }

  if (options.data.image) {
    const imageEl = card.createEl("img", {
      cls: "lu-lc-image",
      attr: {
        src: options.data.image,
        alt: "",
      },
    })
    imageEl.addEventListener("click", e => {
      if (e.button === 0) {
        e.preventDefault()
      }
    })
  }
  const content = card.createEl("div", {
    cls: "lu-lc-content",
  })
  content.createEl("div", {
    text: options.data.title,
    cls: "lu-lc-title",
  })

  if (
    options.data.description
    && options.settings?.ui?.showDescription !== false
  ) {
    content.createEl("div", {
      text: options.data.description,
      cls: "lu-lc-description",
    })
  }
  if (options.settings?.ui?.showHost !== false) {
    content.createEl("div", {
      text: options.data.hostname,
      cls: "lu-lc-host",
    })
  }

  return card
}
