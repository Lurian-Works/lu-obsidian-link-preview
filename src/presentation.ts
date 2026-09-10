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

export function linkCard(options: {
  data: LinkObject
  onClick: (event: PointerEvent, path: string) => void | Promise<void>
  showHost?: boolean
}) {
  const card = createEl("div", {
    cls: "lu-lc-card",
  })
  card.addEventListener("click", e => {
    options.onClick(e, options.data.path)
  })
  if (options.data.image) {
    card.createEl("img", {
      cls: "lu-lc-image",
      attr: {
        src: options.data.image,
        alt: "",
      },
    })
  }
  const content = card.createEl("div", {
    cls: "lu-lc-content",
  })
  content.createEl("div", {
    text: options.data.title,
    cls: "lu-lc-title",
  })
  if (options.data.description) {
    content.createEl("div", {
      text: options.data.description,
      cls: "lu-lc-description",
    })
  }
  if (options.showHost === true || options.showHost === undefined) {
    content.createEl("div", {
      text: options.data.hostname,
      cls: "lu-lc-host",
    })
  }

  return card
}
