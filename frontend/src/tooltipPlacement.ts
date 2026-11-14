// Where a tooltip goes: above its anchor when there is room, else below, kept inside the window.

// ---------- Constants ----------

const GAP = 8 // px between the anchor and the bubble
const MARGIN = 8 // px the bubble keeps from the window's edge
const ARROW_INSET = 12 // px the arrow keeps from the bubble's corners

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface Placed {
  left: number
  top: number
  side: 'top' | 'bottom' // the side of the anchor the bubble sits on
  arrow: number // px from the bubble's left edge to the arrow's centre
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high))

/** The bubble's position for an anchor, given the bubble's size and the window's. */
export function place(anchor: Box, bubble: { w: number; h: number }, view: { w: number; h: number }): Placed {
  const above = anchor.top - bubble.h - GAP >= MARGIN
  const centre = anchor.left + anchor.width / 2
  const left = clamp(centre - bubble.w / 2, MARGIN, view.w - bubble.w - MARGIN)
  const top = above ? anchor.top - bubble.h - GAP : Math.min(anchor.top + anchor.height + GAP, view.h - bubble.h - MARGIN)
  return { left, top, side: above ? 'top' : 'bottom', arrow: clamp(centre - left, ARROW_INSET, bubble.w - ARROW_INSET) }
}
