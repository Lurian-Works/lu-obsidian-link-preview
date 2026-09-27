export interface Vector {
  [x: string]: number
}

export interface Vector2D {
  x: number
  y: number
}

export interface Bounds2D {
  min: Vector2D
  max: Vector2D
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

export class BoundingBox {
  min: Vector2D
  max: Vector2D

  constructor(bounds: Bounds2D) {
    this.min = bounds.min
    this.max = bounds.max
  }

  /**
   * Creates a geometry snapshot of an HTML element.
   *
   * The returned BoundingBox is not connected to the element.
   * coordinates are in viewport coordinates
   */
  static fromElement(element: HTMLElement): BoundingBox {
    return new BoundingBox(getHtmlElementBounds(element))
  }

  /**
   * Creates a geometry snapshot of the current viewport.
   */
  static fromViewPort(): BoundingBox {
    return new BoundingBox(getViewportBounds())
  }

  get bounds(): Bounds2D {
    return {
      min: this.min,
      max: this.max,
    }
  }

  set bounds(bounds: Bounds2D) {
    this.min = bounds.min
    this.max = bounds.max
  }

  get size(): Vector2D {
    return {
      x: this.max.x - this.min.x,
      y: this.max.y - this.min.y,
    }
  }

  get center(): Vector2D {
    return {
      x: (this.min.x + this.max.x) / 2,
      y: (this.min.y + this.max.y) / 2,
    }
  }

  /**
   * Returns a new BoundingBox translated by the given offset.
   */
  translate(offset: Vector2D) {
    this.min = {
      x: this.min.x + offset.x,
      y: this.min.y + offset.y,
    }
    this.max = {
      x: this.max.x + offset.x,
      y: this.max.y + offset.y,
    }
  }
}

export function boundsSize(bounds: Bounds2D): Vector2D {
  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
  }
}

export function intersectBounds(a: Bounds2D, b: Bounds2D): Bounds2D | null {
  const min = {
    x: Math.max(a.min.x, b.min.x),
    y: Math.max(a.min.y, b.min.y),
  }

  const max = {
    x: Math.min(a.max.x, b.max.x),
    y: Math.min(a.max.y, b.max.y),
  }

  if (min.x > max.x || min.y > max.y) {
    return null
  }

  return { min, max }
}

/**
 * Calculates the translation necessary to align the selected points
 * of the anchor and object.
 */
export function calculateAnchorOffset(
  anchor: Bounds2D,
  object: Bounds2D,
  position: AnchorPosition,
): Vector2D {
  const anchorPoint = getAnchorPoint(anchor, position)
  const objectPoint = getAnchorPoint(object, position)

  return {
    x: anchorPoint.x - objectPoint.x,
    y: anchorPoint.y - objectPoint.y,
  }
}

export function getAnchorPoint(
  bounds: Bounds2D,
  position: AnchorPosition,
): Vector2D {
  switch (position) {
    case "topLeft":
      return {
        x: bounds.min.x,
        y: bounds.min.y,
      }

    case "topRight":
      return {
        x: bounds.max.x,
        y: bounds.min.y,
      }

    case "bottomLeft":
      return {
        x: bounds.min.x,
        y: bounds.max.y,
      }

    case "bottomRight":
      return {
        x: bounds.max.x,
        y: bounds.max.y,
      }

    case "topCenter":
      return {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: bounds.min.y,
      }

    case "bottomCenter":
      return {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: bounds.max.y,
      }
  }
}

/**
 * Calculates the smallest translation necessary to put this bounding
 * box completely inside the given container.
 *
 * If this box is larger than the container on an axis, its minimum
 * edge is aligned with the container's minimum edge on that axis.
 */
export function calculateConstrainOffset(
  object: Bounds2D,
  container: Bounds2D,
): Vector2D {
  const objectSize = boundsSize(object)
  const containerSize = boundsSize(container)

  let x = 0
  let y = 0

  if (objectSize.x <= containerSize.x) {
    if (object.min.x < container.min.x) {
      x = container.min.x - object.min.x
    } else if (object.max.x > container.max.x) {
      x = container.max.x - object.max.x
    }
  } else {
    x = container.min.x - object.min.x
  }

  if (objectSize.y <= containerSize.y) {
    if (object.min.y < container.min.y) {
      y = container.min.y - object.min.y
    } else if (object.max.y > container.max.y) {
      y = container.max.y - object.max.y
    }
  } else {
    y = container.min.y - object.min.y
  }

  return { x, y }
}

/* ====================
  DOM Related
==================== */

/**
 * Creates a geometry snapshot of an HTML element.
 *
 * The returned BoundingBox is not connected to the element.
 * coordinates are in viewport coordinates
 */
export function getHtmlElementBounds(element: HTMLElement): Bounds2D {
  const rect = element.getBoundingClientRect()

  return {
    min: {
      x: rect.left,
      y: rect.top,
    },
    max: {
      x: rect.right,
      y: rect.bottom,
    },
  }
}

/**
 * Creates a geometry snapshot of the current viewport.
 */
export function getViewportBounds(): Bounds2D {
  return {
    min: {
      x: 0,
      y: 0,
    },
    max: {
      x: window.innerWidth,
      y: window.innerHeight,
    },
  }
}
