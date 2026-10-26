import type { LinkCardSettings } from "./config/link-card-config"
import type { LinkObject } from "./schema"
import { MouseTracker, setAnchor, setPosition } from "./utils/dom-helper"

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

export function modal() {
  const modal = createEl("dialog")
  modal.closedBy = "any"
  modal.addEventListener("click", e => {
    const dialogDimensions = modal.getBoundingClientRect()
    if (
      e.clientX < dialogDimensions.left
      || e.clientX > dialogDimensions.right
      || e.clientY < dialogDimensions.top
      || e.clientY > dialogDimensions.bottom
    ) {
      modal.close()
    }
  })
  return modal
}

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

  // Display Type
  if (options.data.display === "quad") {
    card.classList.add("lu-lc-quad")
  }
  if (options.data.display === "inline") {
    card.classList.add("lu-lc-inline")
  }

  // Hover Info
  const popup = new HoverPopup({
    target: card,
    text: options.data.path,
    anchorToMouse: true,
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
}
export class ContextMenu {
  modal
  private mousePosition

  /**@param target the element which the context menu belongs to */
  constructor(private readonly target: HTMLElement) {
    this.modal = modal()
    this.modal.classList.add("lu-ctx-menu")
    this.mousePosition = new MouseTracker(this.target)
    this.target.addEventListener("click", e => {
      if (e.button === 2) {
        e.preventDefault()
        this.open()
      }
    })
  }
  open = () => {
    const mousePos = this.mousePosition.get()
    if (mousePos) setPosition(this.modal, mousePos)
    this.modal.showModal()
  }
  close = () => {
    this.modal.close()
  }
  destroy = () => {
    this.mousePosition.stop()
    this.modal.close()
    this.target?.removeEventListener("click", e => {
      if (e.button === 2) {
        e.preventDefault()
        this.open()
      }
    })
  }
}

interface HoverPopupOptions {
  /** element to listen for hover. will also be the anchor of the popup if not otherwise specified */
  target: HTMLElement
  /** true by default set position to the mouse position instead of anchoring to the target element. Falls back to anchor if the mouse position is not available*/
  anchorToMouse?: boolean
  delay?: number
  text?: string
}
export class HoverPopup {
  wrapper
  hoverTrigger
  mousePos

  constructor(private readonly options: HoverPopupOptions) {
    this.wrapper = createEl("div", { cls: "lu-popup" })
    this.wrapper.style.position = "fixed"
    if (options.text) this.wrapper.textContent = options.text

    if (this.options.anchorToMouse === false) {
      setAnchor(this.options.target, this.wrapper)
    } else {
      this.mousePos = new MouseTracker(options.target)
    }
    this.hoverTrigger = new HoverTrigger(
      options.target,
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
    if (this.options.anchorToMouse !== false && this.mousePos) {
      const pos = this.mousePos.get()
      if (pos) {
        setPosition(this.wrapper, pos)
      }
    }
    document.body.appendChild(this.wrapper)
  }
  close = () => {
    if (!this.isOpen) return
    this.wrapper.remove()
  }
  destroy = () => {
    this.hoverTrigger?.destroy()
    this.mousePos?.stop()
    this.wrapper?.remove()
  }
}
