import { ChevronDown, ChevronRight, Minus, X } from 'lucide-react'
import { useState } from 'react'
import { ROWS_SHOWN, SHOW_ALL_UP_TO, trendOf, worstFirst } from '../board'
import type { Previous, RuleResult } from '../types'
import { CheckRow } from './CheckRow'
import { HealthStrip } from './HealthStrip'

interface Props {
  rules: RuleResult[]
  previous: Previous | null | undefined
  selected: string // the check picked
  group: string | null // the group of checks picked, if any
  lowestFloat: number | null | undefined
  onPick: (id: string) => void
  onGroup: (group: string | null) => void
}

/** All the checks in one card. Failing checks are rows, worst first. Passing ones and ones that can't run fold into a line each. */
export function CheckBoard({ rules, previous, selected, group, lowestFloat, onPick, onGroup }: Props) {
  const [more, setMore] = useState(false)
  const inScope = group ? rules.filter((r) => r.group === group) : rules
  const failing = worstFirst(inScope)
  const within = inScope.filter((r) => r.status === 'pass')
  const cannot = inScope.filter((r) => r.status === 'n/a')
  const few = rules.length <= SHOW_ALL_UP_TO // a small set: every check is a row
  const shown = more || few ? failing : failing.slice(0, ROWS_SHOWN)
  const row = (r: RuleResult, quiet = false) => (
    <CheckRow key={r.id} rule={r} trend={trendOf(r, previous)} selected={selected === r.id} onSelect={onPick} lowestFloat={lowestFloat} quiet={quiet} />
  )

  return (
    <section className="card board" aria-label="Checks">
      <HealthStrip rules={rules} selected={selected} group={group} onPick={onPick} onGroup={onGroup} />
      {group && (
        <span className="chip">
          {group} checks only
          <button type="button" className="chip-x" aria-label="Show every group of checks again" onClick={() => onGroup(null)}>
            <X size={12} aria-hidden />
          </button>
        </span>
      )}

      {few ? (
        <div className="crows">
          {failing.map((r) => row(r))}
          {within.map((r) => row(r))}
          {cannot.map((r) => <NotRun key={r.id} rule={r} />)}
        </div>
      ) : (
        <>
          <h2 className="board-title">
            Needs attention <span className="faint num">{failing.length}</span>
          </h2>
          {failing.length === 0 ? <p className="hint board-none">Nothing in {group ?? 'the file'} is over its limit.</p> : <div className="crows">{shown.map((r) => row(r))}</div>}
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
