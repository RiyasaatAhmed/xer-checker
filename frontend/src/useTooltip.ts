// The timing behind the tooltip layer, from the portfolio's Astryx Tooltip: hover with a delay, keyboard
// focus at once, Escape to dismiss, and a short grace period so the pointer can move onto the bubble
// (WCAG 1.4.13). One layer serves every element that has a data-tip, so a page of thousands of cells is cheap.

import { useEffect, useRef, useState } from 'react'

// ---------- Constants ----------

const SHOW_MS = 250 // hover this long before the first tooltip shows
const HIDE_MS = 120 // grace period before it hides, so the pointer can reach the bubble
const WARM_MS = 400 // after one closes, the next shows at once: moving along a row feels instant
export const TIP_ID = 'tooltip-layer'

export interface Tip {
  text: string
  rect: DOMRect // where the anchor was when the tooltip opened
}

/** The open tooltip, if any, and the handlers the bubble needs so the pointer can rest on it. */
export function useTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const timers = useRef<{ show?: number; hide?: number }>({})
  const bubbleHover = useRef({ enter: () => {}, leave: () => {} })

  useEffect(() => {
    let anchor: HTMLElement | null = null
    let closedAt = 0
    const tipOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null)
    const clear = () => {
      window.clearTimeout(timers.current.show)
      window.clearTimeout(timers.current.hide)
    }
    const close = () => {
      clear()
      if (anchor?.getAttribute('aria-describedby') === TIP_ID) anchor.removeAttribute('aria-describedby')
      if (anchor) closedAt = Date.now()
      anchor = null
      setTip(null)
    }
    const open = (el: HTMLElement) => {
      const text = el.getAttribute('data-tip')
      if (!text || !el.isConnected) return
      if (anchor?.getAttribute('aria-describedby') === TIP_ID) anchor.removeAttribute('aria-describedby')
      anchor = el
      el.setAttribute('aria-describedby', TIP_ID)
      setTip({ text, rect: el.getBoundingClientRect() })
    }
    const hideSoon = () => {
      window.clearTimeout(timers.current.show)
      window.clearTimeout(timers.current.hide)
      timers.current.hide = window.setTimeout(close, HIDE_MS)
    }

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = tipOf(e.target)
      if (!el) return
      clear()
      if (el === anchor) return
      const wait = anchor || Date.now() - closedAt < WARM_MS ? 0 : SHOW_MS
      timers.current.show = window.setTimeout(() => open(el), wait)
    }
    const onOut = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const el = tipOf(e.target)
      if (!el || (e.relatedTarget instanceof Node && el.contains(e.relatedTarget))) return
      hideSoon()
    }
    const onFocus = (e: FocusEvent) => {
      const el = tipOf(e.target)
      if (el && el.matches(':focus-visible')) {
        clear()
        open(el)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', close)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', close, true) // a click acts: the tooltip gets out of the way
    document.addEventListener('scroll', close, true) // the anchor moves: the tooltip would point at nothing
    window.addEventListener('blur', close)
    bubbleHover.current = { enter: clear, leave: hideSoon }
    return () => {
      close()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', close)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('blur', close)
    }
  }, [])

  return {
    tip,
    bubbleProps: { onPointerEnter: () => bubbleHover.current.enter(), onPointerLeave: () => bubbleHover.current.leave() },
  }
}
