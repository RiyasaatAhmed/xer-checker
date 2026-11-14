// Windowing for a long list of rows whose heights are known: which rows are on screen.
// Only those are rendered, so 20 rows or 20,000 cost the same.

/** Where each item starts, from the top. offsets[count] is the total height. */
export function offsetsOf(heights: number[]): number[] {
  const offsets = new Array<number>(heights.length + 1)
  offsets[0] = 0
  for (let i = 0; i < heights.length; i++) offsets[i + 1] = offsets[i] + heights[i]
  return offsets
}

/** The first item that ends below `top`: the one at the top of the screen. Binary search. */
export function itemAt(offsets: number[], top: number): number {
  let lo = 0
  let hi = offsets.length - 2 // the last item
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid + 1] <= top) lo = mid + 1
    else hi = mid
  }
  return Math.max(0, lo)
}

/** The items to render for a scroll position: those on screen, plus `overscan` on each side. */
export function windowOf(offsets: number[], top: number, viewport: number, overscan: number): { first: number; start: number; end: number } {
  const count = offsets.length - 1
  if (count <= 0) return { first: 0, start: 0, end: 0 }
  const first = itemAt(offsets, top)
  const last = itemAt(offsets, top + viewport)
  return { first, start: Math.max(0, first - overscan), end: Math.min(count, last + 1 + overscan) }
}
