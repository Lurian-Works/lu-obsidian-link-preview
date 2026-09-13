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

// DOM HELPER

export type ElementOptions = {
  cls?: string | readonly string[]
  text?: string
  attr?: Record<string, string>
  parent?: Node
  children?: Node | readonly Node[]
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: ElementOptions,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tagName)

  if (options?.cls) {
    el.classList.add(
      ...(typeof options.cls === "string" ? [options.cls] : options.cls),
    )
  }

  if (options?.text !== undefined) {
    el.textContent = options.text
  }

  if (options?.attr) {
    for (const [name, value] of Object.entries(options.attr)) {
      el.setAttribute(name, value)
    }
  }

  if (options?.children) {
    el.append(
      ...(Array.isArray(options.children)
        ? options.children
        : [options.children]),
    )
  }

  options?.parent?.appendChild(el)

  return el
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
    const imageEl = createEl("img", {
      cls: "lu-lc-image",
      attr: {
        src: options.data.image,
        alt: "",
      },
    })
    card.appendChild(imageEl)
    imageEl.addEventListener("click", e => {
      if (e.button === 0) {
        e.preventDefault()
      }
    })
  }
  const content = createEl("div", {
    cls: "lu-lc-content",
  })
  card.appendChild(content)

  const titleEl = createEl("div", {
    text: options.data.title,
    cls: "lu-lc-title",
  })
  content.appendChild(titleEl)

  if (
    options.data.description
    && options.settings?.ui?.showDescription !== false
  ) {
    const descriptionEl = createEl("div", {
      text: options.data.description,
      cls: "lu-lc-description",
    })
    content.appendChild(descriptionEl)
  }
  if (options.settings?.ui?.showHost !== false) {
    const hostnameEl = createEl("div", {
      text: options.data.hostname,
      cls: "lu-lc-host",
    })
    content.appendChild(hostnameEl)
  }

  return card
}
