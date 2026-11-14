import { describe, expect, it } from 'vitest'
import { itemAt, offsetsOf, windowOf } from './virtual'

describe('virtual', () => {
  it('adds up the heights into where each item starts, and the total', () => {
    expect(offsetsOf([40, 56, 56])).toEqual([0, 40, 96, 152])
  })

  it('finds the item at the top of the screen', () => {
    const offsets = offsetsOf([40, 56, 56, 56]) // starts at 0, 40, 96, 152; ends at 208
    expect([0, 39, 40, 95, 96, 207].map((top) => itemAt(offsets, top))).toEqual([0, 0, 1, 1, 2, 3])
  })

  it('renders the items on screen plus a few either side, and stays inside the list', () => {
    const offsets = offsetsOf(Array.from({ length: 20000 }, () => 56))
    expect(windowOf(offsets, 0, 520, 4)).toEqual({ first: 0, start: 0, end: 14 }) // 10 on screen, 4 spare below
    const deep = windowOf(offsets, 56 * 10000, 520, 4)
    expect(deep.first).toBe(10000)
    expect(deep.end - deep.start).toBeLessThan(30) // 20,000 rows, about 20 rendered
    expect(windowOf(offsets, 56 * 20000, 520, 4).end).toBe(20000) // scrolled to the very end
    expect(windowOf([0], 0, 520, 4)).toEqual({ first: 0, start: 0, end: 0 }) // an empty list
  })
})
