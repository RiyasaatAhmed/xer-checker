import { ChevronRight, Flag } from 'lucide-react'
import type { CSSProperties } from 'react'
import { MAX_WORST, isSerious, limitParts, worstFirst } from '../board'
import { problemText, ruleText } from '../rules'
import type { RuleResult } from '../types'

// ---------- Constants ----------

// What each tier asks of the reader, so the weight of a check is read, not guessed
const TIERS = [
  { key: 'serious', title: 'Serious', advice: 'fix these before trusting the dates' },
  { key: 'minor', title: 'Minor', advice: 'tidy these at the next update' },
] as const

interface Props {
  rules: RuleResult[]
  checked: number // activities checked: a small file shows "1 of 4", not a share
  onPick: (id: string) => void // list a check's activities
}

/** Every check over its limit, under Serious or Minor. The worst 3 are sentences led by their count, with why they
 *  matter; the rest are chips. Each one opens its activities. */
export function OverLimit({ rules, checked, onPick }: Props) {
  const failing = worstFirst(rules)
  if (failing.length === 0) return null
  const written = new Set(failing.slice(0, MAX_WORST).map((r) => r.id))
  // The counts sit in one right-aligned column, sized to the longest, so the sentences start in line
  const digits = Math.max(1, ...failing.filter((r) => written.has(r.id)).map((r) => problemText(r).count.length))
  return (
    <div className="over" role="group" aria-label="Checks over the limit" style={{ '--digits': digits } as CSSProperties}>
      {TIERS.map((tier) => {
        const inTier = failing.filter((r) => (tier.key === 'serious') === isSerious(r))
        if (inTier.length === 0) return null
        const lines = inTier.filter((r) => written.has(r.id))
        const chips = inTier.filter((r) => !written.has(r.id))
        return (
          <div key={tier.key} className={`over-tier ${tier.key}`}>
            <h3 className="over-title">
              {tier.title} <span className="num">{inTier.length}</span>{' '}
              <span className="over-advice">· {tier.advice}</span>
            </h3>
            {lines.length > 0 && (
              <ol className="over-lines">
                {lines.map((r) => (
                  <li key={r.id}>
                    <Sentence rule={r} checked={checked} onPick={onPick} />
                  </li>
                ))}
              </ol>
            )}
            {chips.length > 0 && (
              <ul className="over-chips">
                {chips.map((r) => (
                  <li key={r.id}>
                    <Chip rule={r} checked={checked} onPick={onPick} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** One failing check as a sentence: how many activities, what is wrong, its size against the limit, and why it matters. */
function Sentence({ rule, checked, onPick }: { rule: RuleResult; checked: number; onPick: (id: string) => void }) {
  const serious = isSerious(rule)
  const { count, text } = problemText(rule)
  const { share, against } = limitParts(rule, checked)
  const why = ruleText(rule.id).impact
  return (
    <button type="button" className={`over-line${serious ? ' serious' : ''}`} onClick={() => onPick(rule.id)} data-tip={`${rule.name}${rule.dcma_section ? `, DCMA ${rule.dcma_section}` : ''}. Click to list the activities`}>
      <Flag className="over-icon" size={15} strokeWidth={2.5} fill={serious ? 'currentColor' : 'none'} aria-hidden />
      {/* the spaces are for screen readers: the grid draws the gaps */}
      <span className="over-count num">{count}</span>{' '}
      <span className="over-text">{text}</span>{' '}
      <span className="over-size">
        {share && <b className="num">{share}</b>}
        {share && ' · '}
        {against}
      </span>{' '}
      <ChevronRight className="over-go" size={16} aria-hidden />
      {why && <span className="over-why">{why}</span>}
    </button>
  )
}

/** One failing check, compact: its name and how many activities, with the full sentence on hover. */
function Chip({ rule, checked, onPick }: { rule: RuleResult; checked: number; onPick: (id: string) => void }) {
  const serious = isSerious(rule)
  const { count, text } = problemText(rule)
  const { share, against } = limitParts(rule, checked)
  return (
    <button type="button" className="over-chip" onClick={() => onPick(rule.id)} data-tip={`${count ? `${count} ` : ''}${text}. ${share ? `${share} · ` : ''}${against}`}>
      <Flag size={13} strokeWidth={2.5} fill={serious ? 'currentColor' : 'none'} aria-hidden />
      <span className="over-chip-name">{rule.name}</span>{' '}
      {count && (
        <span className="over-chip-count">
          <b className="num">{count}</b> {rule.count === 1 ? 'activity' : 'activities'}
        </span>
      )}
    </button>
  )
}
