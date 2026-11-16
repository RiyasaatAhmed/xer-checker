import { ChevronDown, ChevronRight, Minus, X } from 'lucide-react'
import { useState } from 'react'
import { ROWS_SHOWN, SHOW_ALL_UP_TO, isSerious, trendOf, worstFirst } from '../board'
import type { Previous, RuleResult, SetCount } from '../types'

// ---------- Constants ----------

const TICKS = [0, 25, 50, 75, 100] // the board's axis, in % of the activities checked
import { CheckRow } from './CheckRow'
import { SetBars } from './SetBars'

interface Props {
  rules: RuleResult[]
  previous: Previous | null | undefined
  selected: string // the check picked
  group: string | null // the group of checks picked, if any
  lowestFloat: number | null | undefined
  checked: number // activities checked
  notes?: Record<string, string> // what else a row counts, by check ID: { leads: "18 leads" }
  onPick: (id: string) => void
  onGroup: (group: string | null) => void
  sets?: SetCount[] // activities flagged per set, drawn as bars over the rows
}

/** All the checks in one card, under one heading. Failing checks are rows, worst first, under Serious and Minor.
 *  Passing ones and ones that can't run fold into a line each. */
export function CheckBoard({ rules, previous, selected, group, lowestFloat, checked, notes = {}, onPick, onGroup, sets = [] }: Props) {
  const [more, setMore] = useState(false)
  const inScope = group ? rules.filter((r) => r.group === group) : rules
  const failing = worstFirst(inScope)
  const within = inScope.filter((r) => r.status === 'pass')
  const cannot = inScope.filter((r) => r.status === 'n/a')
  const few = rules.length <= SHOW_ALL_UP_TO // a small set: every check is a row
  const shown = more || few ? failing : failing.slice(0, ROWS_SHOWN)
  const row = (r: RuleResult, quiet = false) => (
    <CheckRow key={r.id} rule={r} trend={trendOf(r, previous)} selected={selected === r.id} onSelect={onPick} checked={checked} note={notes[r.id]} lowestFloat={lowestFloat} quiet={quiet} />
  )
  // Failing rows under "Serious" and "Minor", so the weight of each is read, not guessed
  const tiers = (list: RuleResult[]) =>
    [
      { title: 'Serious', rows: list.filter(isSerious) },
      { title: 'Minor', rows: list.filter((r) => !isSerious(r)) },
    ]
      .filter((t) => t.rows.length > 0)
      .map((t) => (
        <div key={t.title} className="tier">
          <h3 className={`tier-title${t.title === 'Serious' ? ' serious' : ''}`}>
            {t.title} <span className="faint num">{t.rows.length}</span>
          </h3>
          <div className="crows">{t.rows.map((r) => row(r))}</div>
        </div>
      ))

  return (
    <section className="card board" aria-labelledby="board-title">
      <div className="card-head">
        <h2 id="board-title">Checks</h2>
      </div>
      {/* One axis for the set bars and the check rows under them */}
      <Axis checked={checked} />
      {sets.length > 0 && <SetBars sets={sets} rules={rules} checked={checked} group={group} onGroup={onGroup} />}
      {group && (
        <span className="chip">
          {group} checks only
          <button type="button" className="chip-x" aria-label="Show every group of checks again" onClick={() => onGroup(null)}>
            <X size={12} aria-hidden />
          </button>
        </span>
      )}

      {few ? (
        <>
          {tiers(failing)}
          {within.length + cannot.length > 0 && (
            <div className="crows">
              {within.map((r) => row(r))}
              {cannot.map((r) => <NotRun key={r.id} rule={r} />)}
            </div>
          )}
        </>
      ) : (
        <>
          {failing.length === 0 ? <p className="hint board-none">Nothing in {group ?? 'the file'} is over its limit.</p> : tiers(shown)}
          {!few && failing.length > ROWS_SHOWN && (
            <button type="button" className="link-inline board-more" onClick={() => setMore(!more)}>
              {more ? 'Show fewer' : `Show ${failing.length - ROWS_SHOWN} more`}
            </button>
          )}
          {within.length > 0 && (
            <Fold title="Within the limit" count={within.length}>
              <div className="crows">{within.map((r) => row(r, true))}</div>
            </Fold>
          )}
          {cannot.length > 0 && (
            <Fold title="Can’t be checked" count={cannot.length}>
              <div className="crows">{cannot.map((r) => <NotRun key={r.id} rule={r} />)}</div>
            </Fold>
          )}
        </>
      )}
    </section>
  )
}

/** The scale every bar is drawn on, once over the rows: 0 to 100% of the activities checked. It sits in the bars' column. */
function Axis({ checked }: { checked: number }) {
  return (
    <div className="crow-axis" aria-hidden="true">
      <span className="crow-axis-label">% of {checked.toLocaleString()} activities checked</span>
      <span className="crow-axis-scale">
        {TICKS.map((t) => (
          <span key={t} style={{ left: `${t}%` }}>
            {t}%
          </span>
        ))}
      </span>
    </div>
  )
}

/** A folded line: its name and count, and the rows behind a click. */
function Fold({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fold">
      <button type="button" className="fold-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        {title} <span className="faint num">{count}</span>
      </button>
      {open && children}
    </div>
  )
}

/** A check that could not run, with the reason. It is not a pass. */
function NotRun({ rule }: { rule: RuleResult }) {
  return (
    <div className="crow na">
      <span className="crow-name">
        <Minus size={15} strokeWidth={2.5} aria-hidden />
        <span>{rule.name}</span>
        <span className="vh">Can’t be checked</span>
      </span>
      <span className="crow-why">{rule.na_reason ?? 'Nothing to check.'}</span>
    </div>
  )
}
