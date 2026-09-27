import type { LinkCardSettings } from "./config/link-card-config"
import type { LinkObject } from "./schema"
import { setAnchoredPosition } from "./utils/dom-helper"
import type { AnchorPosition } from "./utils/geo-math"

export function errorEl(message: string, options?: ErrorOptions) {
  let causeMessage: string | undefined
  if (options?.cause) {
    if (options.cause instanceof Error) {
      causeMessage = options.cause.message
    } else {
      causeMessage = JSON.stringify(options.cause)
    }
  }

  return createEl("div", {
    text: causeMessage ? `${message} - cause: ${causeMessage}` : message,
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

  // Card Base - native href or function
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

  // Display options
  if (options.data.display === "quad") {
    card.classList.add("lu-lc-quad")
  }
  if (options.data.display === "inline") {
    card.classList.add("lu-lc-inline")
  }

  // Hover
  new HoverInfo({
    text: options.data.path,
    anchor: card,
    layout: "topCenter",
  })

  // Image
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

  // Content
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

export class HoverTrigger {
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly element: HTMLElement,
    private readonly delay: number,
    private readonly onTrigger: () => void,
    private readonly onCancel: () => void,
  ) {
    element.addEventListener("pointerenter", this.enter)
    element.addEventListener("pointerleave", this.leave)
  }

  private enter = () => {
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.onTrigger()
    }, this.delay)
  }

  private leave = () => {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    this.onCancel()
  }

  clearTimer() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  destroy() {
    this.leave()
    this.element.removeEventListener("pointerenter", this.enter)
    this.element.removeEventListener("pointerleave", this.leave)
  }
}

export interface ContextMenuOptions {
  target: HTMLElement
  content: HTMLElement | (() => HTMLElement | Promise<HTMLElement>)
  boundary?: HTMLElement | (() => HTMLElement | Promise<HTMLElement>)
  onOpen?: (() => void) | undefined
  onClose?: (() => void) | undefined
}

export class ContextMenu {
  wrapper
  private target
  /**
   * hooks will be called before the element opens/closes
   */
  constructor(private readonly options: ContextMenuOptions) {
    this.wrapper = createEl("div", { cls: "lu-context-menu" })
    this.target = this.options.target || document.body
    document.addEventListener("click", this.handleOutsideClick)
    this.target.addEventListener("click", e => {})
  }

  get isOpen() {
    return this.wrapper.isConnected
  }

  private handleOutsideClick = (event: MouseEvent) => {
    if (!this.isOpen) return
    const target = event.target
    if (!(target instanceof Node)) return
    if (this.wrapper.contains(target)) return
    const comPath = event.composedPath?.() as Node[] | undefined
    if (comPath?.includes(this.wrapper)) return
    this.close()
  }

  private handleEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return
    this.close()
  }

  open = () => {
    if (this.isOpen) return
    document.body.appendChild(this.wrapper)
    document.addEventListener("keydown", this.handleEscape)
  }

  close = () => {
    if (!this.isOpen) return
    if (this.options.onClose) {
      this.options.onClose()
    }
    this.wrapper.remove()
    document.removeEventListener("keydown", this.handleEscape)
  }
}

interface PopupOptions {
  anchor?: HTMLElement | undefined
  layout?: AnchorPosition | undefined
  content?: HTMLElement
  constrainToElememt?: HTMLElement
  onOpen?: (() => void) | undefined
  onClose?: (() => void) | undefined
}

export class Popup {
  wrapper
  constructor(private options: PopupOptions) {
    this.wrapper = createEl("div", { cls: "lu-popup" })
    if (options.content) {
      this.wrapper.appendChild(options.content)
    }
  }

  get isOpen() {
    return this.wrapper.isConnected
  }

  open = () => {
    if (this.isOpen) return
    if (this.options.onOpen) {
      this.options.onOpen()
    }
    if (this.options.anchor) {
      setAnchoredPosition(this.options.anchor, this.wrapper, {
        position: this.options.layout,
        constrainToWindow: true,
        constrainToElement: this.options.constrainToElememt,
      })
    }
    document.body.appendChild(this.wrapper)
  }

  close = () => {
    if (this.options.onClose) {
      this.options.onClose()
    }
    if (!this.isOpen) return
    this.wrapper.remove()
  }
}

interface HoverPopupOptions extends PopupOptions {
  anchor: HTMLElement
  delay?: number
}

export class HoverPopup {
  wrapper
  hoverTrigger

  constructor(private readonly options: HoverPopupOptions) {
    this.wrapper = createEl("div", { cls: "lu-popup" })
    this.hoverTrigger = new HoverTrigger(
      options.anchor,
      options.delay || 2500,
      this.open,
      this.close,
    )
  }

  get isOpen() {
    return this.wrapper.isConnected
  }

  open = () => {
    if (this.isOpen) return
    document.body.appendChild(this.wrapper)
    setAnchoredPosition(this.options.anchor, this.wrapper, {
      position: this.options.layout,
      constrainToWindow: true,
      constrainToElement: this.options.constrainToElememt,
    })
  }

  close = () => {
    if (!this.isOpen) return
    this.wrapper.remove()
    this.hoverTrigger.clearTimer()
  }
}

interface InfoPopupOptions extends HoverPopupOptions {
  heading?: string
  text?: string
}

export class HoverInfo extends HoverPopup {
  constructor(options: InfoPopupOptions) {
    super(options)
    this.wrapper.classList.add("lu-info-popup")
    if (options.heading) {
      this.wrapper.appendChild(createEl("h4", { text: options.heading }))
    }
    if (options.text) {
      this.wrapper.appendChild(createEl("span", { text: options.text }))
    }
  }
}
