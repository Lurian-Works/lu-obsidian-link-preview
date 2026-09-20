import { modal } from "mycea-lib-ui"
import type { LinkCardSettings } from "./config/link-card-config"
import type { LinkObject } from "./schema"

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
  const HoverModal = new modal.description({
    text: options.data.path,
    anchor: card,
    position: "topCenter",
    cls: "lu-lc-hover",
  })
  new HoverTrigger(
    card,
    3000,
    () => HoverModal.open(),
    () => HoverModal.close(),
  )

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

  destroy() {
    this.leave()
    this.element.removeEventListener("pointerenter", this.enter)
    this.element.removeEventListener("pointerleave", this.leave)
  }
}

export const anchorPositions = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
  "topCenter",
  "bottomCenter",
] as const

export type AnchorPosition = (typeof anchorPositions)[number]

/**
 * @param position bottom right - default
 */
export function setAbsoluteAnchoredPosition(
  el: HTMLElement,
  anchor: HTMLElement,
  position?: AnchorPosition,
) {
  const anchorRec = anchor.getBoundingClientRect()
  el.style.position = "fixed"

  const docWidth = document.body.getBoundingClientRect().width
  //const docHeight = document.body.getBoundingClientRect().height
  const boundingCenterH =
    (anchorRec.right - anchorRec.left) / 2 + anchorRec.left

  if (position === "topLeft") {
    el.style.right = `${docWidth - anchorRec.left}px`
    el.style.bottom = `${anchorRec.bottom}px`
  } else if (position === "topRight") {
    el.style.left = `${anchorRec.right}px`
    el.style.bottom = `${anchorRec.bottom}px`
  } else if (position === "topCenter") {
    el.style.right = `${boundingCenterH}px`
    el.style.bottom = `${anchorRec.top}px`
  } else if (position === "bottomLeft") {
    el.style.right = `${docWidth - anchorRec.left}px`
    el.style.top = `${anchorRec.bottom}px`
  } else if (position === "bottomCenter") {
    el.style.right = `${boundingCenterH}px`
    el.style.top = `${anchorRec.bottom}px`
  } else {
    el.style.left = `${anchorRec.right}px`
    el.style.top = `${anchorRec.bottom}px`
  }
}

export interface ContextModalOptions {
  anchor?: HTMLElement | undefined
  layout?: AnchorPosition | undefined
  onOpen?: (() => void) | undefined
  onClose?: (() => void) | undefined
}

export class ContextModal {
  /**
   * parent of wrapper
   */
  overlay
  wrapper
  private readonly anchor: HTMLElement | undefined
  private readonly layout
  private readonly onOpen
  private readonly onClose
  /**
   * hooks will be called before the element opens/closes
   * @param options.layout only used for anchored modals - default to "bottom-right"
   */
  constructor(options?: ContextModalOptions) {
    this.layout = options?.layout
    this.anchor = options?.anchor
    this.onOpen = options?.onClose
    this.onClose = options?.onClose

    this.overlay = createEl("div")
    this.overlay.className = "lu-modal-overlay"
    this.overlay.addEventListener("click", this.handleOutsideClick)

    this.wrapper = createEl("div", { cls: "lu-context-menu" })

    this.handleOutsideClick.bind(this)
    this.handleEscape.bind(this)
    this.open.bind(this)
    this.close.bind(this)
  }

  get isOpen() {
    return this.wrapper.isConnected
  }

  private handleOutsideClick = (event: MouseEvent) => {
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

  open() {
    if (this.isOpen) return
    if (this.onOpen) {
      this.onOpen()
    }
    if (this.anchor) {
      setAbsoluteAnchoredPosition(this.wrapper, this.anchor, this.layout)
    }
    document.body.appendChild(this.overlay)
    document.addEventListener("keydown", this.handleEscape)
  }

  close() {
    if (!this.isOpen) return
    if (this.onClose) {
      this.onClose()
    }
    this.overlay.remove()
    document.removeEventListener("keydown", this.handleEscape)
  }
}
