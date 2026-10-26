import { simpleIdGen } from "./helper"

export interface Vector2D {
  x: number
  y: number
}

/** starts an event listener and tracks the mouse position */
export class MouseTracker {
  private __ACTIVE?: boolean
  private __pos: { x: number; y: number } | undefined
  constructor(private target: HTMLElement) {
    this.start()
  }
  private storePos = (event: MouseEvent) => {
    this.__pos = {
      x: event.clientX,
      y: event.clientY,
    }
  }
  start() {
    if (this.__ACTIVE) return
    this.target.addEventListener("mousemove", event => {
      this.storePos(event)
    })
    this.__ACTIVE = true
  }
  stop() {
    this.target.removeEventListener("mousemove", event => {
      this.storePos(event)
    })
    this.__ACTIVE = false
    this.__pos = undefined
  }
  get() {
    return this.__pos ? { ...this.__pos } : undefined
  }
  get active() {
    return this.__ACTIVE
  }
}

const anchorIds = simpleIdGen()
/**
 * sets element position to fixed and applies css anchoring. if no positionArea or positionTryFallback are set it uses by deafult `top` and fallback `top, bottom, left, right`
 * @returns the anchored element
 */
export function setAnchor(anchor: HTMLElement, element: HTMLElement) {
  const anchorName = String(anchorIds.next())
  anchor.style.anchorName = anchorName
  element.style.position = "fixed"
  element.style.positionAnchor = anchorName

  if (!element.style.positionArea) element.style.positionArea = "top"
  if (!element.style.positionTryFallbacks)
    element.style.positionTryFallbacks = "top, bottom, left, right"
  return element
}

/**@returns Element position to be `fixed`*/
export function setPosition(element: HTMLElement, mousePos: Vector2D) {
  element.style.left = `${mousePos.x}px`
  element.style.top = `${mousePos.y}px`
}

export function applyOffset(element: HTMLElement, offset: Partial<Vector2D>) {
  element.style.translate = `${offset.x || 0}px ${offset.y || 0}px`
}

export function getTextNodes(element: HTMLElement) {
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }
  return textNodes
}
