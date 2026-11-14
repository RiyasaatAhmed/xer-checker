import { useMemo, useState, type ReactNode } from 'react'
import { offsetsOf, windowOf } from '../virtual'

// ---------- Constants ----------

const OVERSCAN = 4 // items rendered beyond the screen on each side, so a fast scroll doesn't show blanks

interface Props {
  heights: number[] // the height of every item, in px
  maxHeight: number // the list is this tall at most: a fixed window onto however many items
  label: string
  renderItem: (index: number) => ReactNode
  pinned?: (firstIndex: number) => ReactNode // drawn over the top while it applies, like a group name
}

/** A scroll window of fixed height onto a long list. Only the items on screen are in the page. */
export function VirtualList({ heights, maxHeight, label, renderItem, pinned }: Props) {
  const [top, setTop] = useState(0)
  const offsets = useMemo(() => offsetsOf(heights), [heights])
  const total = offsets[offsets.length - 1]
  const height = Math.min(total, maxHeight)
  const { first, start, end } = windowOf(offsets, top, height, OVERSCAN)
  const items = []
  for (let i = start; i < end; i++) {
    items.push(
      <div key={i} role="listitem" aria-setsize={heights.length} aria-posinset={i + 1} className="vitem" style={{ top: offsets[i], height: heights[i] }}>
        {renderItem(i)}
      </div>,
    )
  }
  return (
    <div className="vlist" role="list" aria-label={label} tabIndex={0} style={{ height }} onScroll={(event) => setTop(event.currentTarget.scrollTop)}>
      {pinned && <div className="vlist-pin">{pinned(first)}</div>}
      <div className="vlist-inner" style={{ height: total }}>
        {items}
      </div>
    </div>
  )
}
