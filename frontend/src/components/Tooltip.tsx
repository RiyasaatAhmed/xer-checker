import { useLayoutEffect, useRef, useState } from 'react'
import { place, type Placed } from '../tooltipPlacement'
import { TIP_ID, useTooltip } from '../useTooltip'

/** The one tooltip bubble. Any element with a `data-tip` gets it on hover or keyboard focus. Mount it once, in App. */
export function TooltipLayer() {
  const { tip, bubbleProps } = useTooltip()
  const bubble = useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = useState<Placed | null>(null)

  // Measure the bubble once it holds the text, then put it next to the anchor.
  useLayoutEffect(() => {
    if (!tip || !bubble.current) return setPlaced(null)
    const { width, height } = bubble.current.getBoundingClientRect()
    setPlaced(place(tip.rect, { w: width, h: height }, { w: window.innerWidth, h: window.innerHeight }))
  }, [tip])

  return (
    <div
      ref={bubble}
      id={TIP_ID}
      role="tooltip"
      className="tip"
      data-open={tip && placed ? '' : undefined}
      data-side={placed?.side}
      style={placed ? ({ left: placed.left, top: placed.top, '--arrow': `${placed.arrow}px` } as React.CSSProperties) : undefined}
      {...bubbleProps}
    >
      {tip?.text}
      <span className="tip-arrow" aria-hidden="true" />
    </div>
  )
}
