import { describe, expect, it } from 'vitest'
import { place } from './tooltipPlacement'

const view = { w: 1000, h: 800 }
const bubble = { w: 120, h: 30 }

describe('place', () => {
  it('centres the bubble above its anchor, with the arrow in the middle', () => {
    const p = place({ left: 400, top: 300, width: 40, height: 20 }, bubble, view)
    expect(p).toEqual({ left: 360, top: 262, side: 'top', arrow: 60 })
  })

  it('goes below when there is no room above', () => {
    const p = place({ left: 400, top: 10, width: 40, height: 20 }, bubble, view)
    expect(p.side).toBe('bottom')
    expect(p.top).toBe(38)
  })

  it('stays inside the window at the edges, and the arrow still points at the anchor', () => {
    const left = place({ left: 0, top: 300, width: 20, height: 20 }, bubble, view)
    expect(left.left).toBe(8)
    expect(left.arrow).toBe(12) // the anchor's centre is 10 from the bubble's edge: kept off the corner
    const right = place({ left: 980, top: 300, width: 20, height: 20 }, bubble, view)
    expect(right.left).toBe(872)
    expect(right.arrow).toBe(108)
  })
})
