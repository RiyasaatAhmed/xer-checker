import { useEffect, useState, type CSSProperties } from 'react'
import { percentText } from '../format'
import type { RuleStatus } from '../types'

// ---------- Constants ----------

const STEP_MS = 220 // the gap between one check arriving and the next, as in the demo
const COUNT_MS = 700 // how long a figure takes to count up, as in the demo

/** What a row needs: a full result's rule and a list line's check both have it. */
export interface ShownCheck {
  id: string
  name: string
  status: RuleStatus
  percent?: number | null
  limit_percent?: number | null
  na_reason?: string | null
}

/** The headline checks as the demo draws them: each arrives in turn with its figure and a bar with the limit
 *  marked, red when over the limit and green when within it. */
export function HeadlineChecks({ checks }: { checks: ShownCheck[] }) {
  return (
    <ul className="live-checks">
      {checks.map((check, i) => (
        <li key={check.id} style={{ '--at': `${i * STEP_MS}ms` } as CSSProperties}>
          <Row check={check} delay={i * STEP_MS} />
        </li>
      ))}
    </ul>
  )
}

/** One check: its name, the figure, and a bar with the limit marked. */
function Row({ check, delay }: { check: ShownCheck; delay: number }) {
  const percent = check.percent ?? 0
  const limit = check.limit_percent ?? 0
  const known = check.status !== 'n/a' && check.percent != null // an upload saved before the list carried figures has none
  const state = check.status === 'flag' ? 'flag' : check.status === 'pass' ? 'pass' : 'na'
  const word = state === 'flag' ? `over the ${limit}% limit` : state === 'pass' ? `within the ${limit}% limit` : 'could not run'
  const shown = useCountUp(known ? percent : 0, delay)
  const tip = state === 'na' ? (check.na_reason ?? 'This check could not run') : known ? `${percentText(percent)} of activities, ${word}` : word
  return (
    <div className={`live-row ${state}`} data-tip={tip}>
      <span className="live-check-name">{check.name}</span>
      <span className="live-figure num">{state === 'na' ? 'n/a' : known ? `${shown.toFixed(1)}%` : state === 'flag' ? 'Over' : 'Within'}</span>
      <span className="sr-only">{word}</span>
      <span className="live-meter" aria-hidden>
        {known && (
          <>
            <span className="live-fill" style={{ '--w': `${Math.min(100, percent)}%` } as CSSProperties} />
            <span className="live-limit" style={{ left: `${Math.min(100, limit)}%` }} />
          </>
        )}
      </span>
    </div>
  )
}

/** A figure that counts up from 0 after `delay`, as the demo's do. Reduced motion shows it at once. */
function useCountUp(value: number, delay: number): number {
  const still = (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || typeof requestAnimationFrame !== 'function'
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (still) return
    let frame = 0
    const start = performance.now() + delay
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS))
      setShown(value * (1 - (1 - t) ** 3)) // eases out, like the bar
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, delay, still])
  return still ? value : shown
}
