import {
  type AnchorPosition,
  BoundingBox,
  calculateAnchorOffset,
  calculateConstrainOffset,
  intersectBounds,
  type Vector2D,
} from "./geo-math"

export function getTextNodes(element: HTMLElement) {
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }
  return textNodes
}

/**
 * Applies a visual translation to the element.
 *
 * This is deliberately the only operation in the module that modifies
 * the DOM/CSS position.
 */
function applyOffset(element: HTMLElement, offset: Vector2D): void {
  element.style.translate = `${offset.x}px ${offset.y}px`
}

/**
 * Positions `element` relative to `anchor` and optionally constrains
 * the resulting position.
 */
export function setAnchoredPosition(
  anchor: HTMLElement,
  element: HTMLElement,
  options: {
    position?: AnchorPosition
    constrainToElement?: HTMLElement
    constrainToWindow?: boolean
  } = {},
): void {
  const position = options.position ?? "topRight"

  const elementBounds = BoundingBox.fromElement(element)
  const anchorBounds = BoundingBox.fromElement(anchor)
  const anchorOffset = calculateAnchorOffset(
    elementBounds.bounds,
    anchorBounds.bounds,
    position,
  )
  const boundary = getConstraintBoundary(options)

  if (!boundary) {
    applyOffset(element, anchorOffset)
    return
  }

  elementBounds.translate(anchorOffset)
  const constraintOffset = calculateConstrainOffset(
    elementBounds.bounds,
    boundary.bounds,
  )

  applyOffset(element, {
    x: anchorOffset.x + constraintOffset.x,
    y: anchorOffset.y + constraintOffset.y,
  })
}

/**
 * Constrains an element to the requested boundaries.
 *
 * If both an element boundary and the viewport are enabled, their
 * intersection is used as the effective boundary.
 */
export function constrainElement(
  element: HTMLElement,
  boundingElement?: HTMLElement,
  constrainToWindow = false,
): void {
  const elementBounds = BoundingBox.fromElement(element)

  const boundary = getConstraintBoundary({
    constrainToElement: boundingElement,
    constrainToWindow,
  })
  if (!boundary) {
    return
  }
  const offset = calculateConstrainOffset(elementBounds.bounds, boundary.bounds)

  applyOffset(element, offset)
}

/**
 * @returns
 * `BoundingBox`: constrain boundary which can be an intersection of window and element or one of those boundaries
 * `null`: failed
 * `undefined`: no constrain target
 */
function getConstraintBoundary(options: {
  constrainToElement?: HTMLElement
  constrainToWindow?: boolean
}): BoundingBox | null | undefined {
  let boundary: BoundingBox | null | undefined = undefined

  if (options.constrainToElement) {
    boundary = BoundingBox.fromElement(options.constrainToElement)
  }

  if (options.constrainToWindow) {
    const viewportBounds = BoundingBox.fromViewPort()

    if (!boundary) {
      boundary = viewportBounds
    } else {
      const intersection = intersectBounds(
        boundary.bounds,
        viewportBounds.bounds,
      )

      if (!intersection) {
        return null
      }
    }
  }

  return boundary
}
