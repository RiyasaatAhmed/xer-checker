import { Check, Flag, Minus } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { groupsOf } from '../board'
import { countText, percentText } from '../format'
import { checkName } from '../rules'
import type { RuleStatus } from '../types'

// ---------- Constants ----------

const STEP_MS = 220 // the gap between one check arriving and the next, as in the demo
const ALL_ARRIVE_MS = 1600 // a long list arrives faster, so its last check lands within this
const COUNT_MS = 700 // how long a figure takes to count up, as in the demo

/** What a row needs: a full result's rule and a list line's check both have it. */
export interface ShownCheck {
  id: string
  name: string
  group: string // its set, like "Logic"
  status: RuleStatus
  percent?: number | null
  count?: number | null // activities it flags; missing on an upload listed by an older backend
  limit_percent?: number | null
  na_reason?: string | null
}

/** Every check, by set, in 2 columns, so a file reads at a glance. Each set says how many of its checks are over.
 *  A check over its limit keeps its color; one within it steps back. A set where nothing could run is one line. */
export function CheckBars({ checks }: { checks: ShownCheck[] }) {
  const step = Math.min(STEP_MS, ALL_ARRIVE_MS / Math.max(1, checks.length))
  const at = (check: ShownCheck) => checks.indexOf(check) * step // when each check arrives: report order, across the sets
  return (
    <div className="live-sets">
      {groupsOf(checks).map((group) => {
        const inSet = checks.filter((c) => c.group === group)
        const over = inSet.filter((c) => c.status === 'flag').length
        const start = { '--at': `${at(inSet[0])}ms` } as CSSProperties
        if (inSet.every((c) => c.status === 'n/a')) {
          return (
            <p key={group} className="live-set-off" style={start} data-tip={inSet.map((c) => `${checkName(c)}: ${c.na_reason ?? 'could not run'}`).join(' ')}>
              <Minus size={13} aria-hidden /> <span className="live-set-label">{group}</span> · {countText(inSet.length, 'check')} can’t run
            </p>
          )
        }
        return (
          <section key={group} className="live-set" aria-label={group}>
            <h3 className="live-set-name" style={start}>
              <span className="live-set-label">{group}</span>
              {over > 0 && <span className="live-set-over"> · {over} over</span>}
            </h3>
            <ul className="live-checks">
              {inSet.map((check) => (
                <li key={check.id} style={{ '--at': `${at(check)}ms` } as CSSProperties}>
                  <Row check={check} delay={at(check)} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** One check: its state, name and figure, and a bar against its limit. As on the report, every bar is the share of
 *  activities checked, on one 0 to 100% axis, so lengths compare down the list. The tick is the limit; a limit of 0 has none. */
function Row({ check, delay }: { check: ShownCheck; delay: number }) {
  const percent = check.percent ?? 0
  const limit = check.limit_percent ?? 0
  const known = check.status !== 'n/a' && check.percent != null // an upload saved before the list carried figures has none
  const state = check.status === 'flag' ? 'flag' : check.status === 'pass' ? 'pass' : 'na'
  const word = state === 'flag' ? `over the ${limit}% limit` : state === 'pass' ? `within the ${limit}% limit` : 'could not run'
  const shown = useCountUp(known ? percent : 0, delay)
  const name = checkName(check)
  const tiny = percentText(percent, check.count ?? 0).startsWith('<') // a share above 0 that rounds to 0.0%
  const tip = state === 'na' ? `${name}: ${check.na_reason ?? 'This check could not run'}` : known ? `${name}: ${percentText(percent, check.count ?? 0)} of activities, ${word}` : `${name}: ${word}`
  const barred = known
  return (
    <div className={`live-row ${state}`} data-tip={tip}>
      {state === 'flag' ? <Flag size={13} strokeWidth={2.5} aria-hidden /> : state === 'pass' ? <Check size={13} strokeWidth={2.5} aria-hidden /> : <Minus size={13} aria-hidden />}
      <span className="live-check-name">{name}</span>
      <span className="live-figure num">{state === 'na' ? 'n/a' : known ? (tiny ? '<0.1%' : `${shown.toFixed(1)}%`) : state === 'flag' ? 'Over' : 'Within'}</span>
      <span className="sr-only">{word}</span>
      <span className={`live-meter${barred ? '' : ' empty'}`} aria-hidden>
        {barred && percent > 0 && <span className="live-fill" style={{ '--w': `${Math.min(100, percent)}%` } as CSSProperties} />}
        {barred && limit > 0 && <span className="live-limit" style={{ left: `${Math.min(100, limit)}%` }} />}
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
