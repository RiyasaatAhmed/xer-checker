import { Check, Copy, Download, Search } from 'lucide-react'
import { useState } from 'react'
import { countText, csvText } from '../format'
import { ruleText } from '../rules'
import type { RuleResult } from '../types'

// ---------- Constants ----------

const COPIED_MS = 2000 // how long "Copied" shows on the button

interface Props {
  rule: RuleResult
  fileName: string // names the CSV download
}

/** The activity IDs behind one rule's number: filter them, copy them for P6, or download them. */
export function FlaggedActivities({ rule, fileName }: Props) {
  const [filter, setFilter] = useState('')
  const [copied, setCopied] = useState(false)
  const query = filter.trim().toLowerCase()
  // Each row keeps its place in the full list: an ID can repeat when a file holds 2 P6 projects.
  const shown = rule.activities.map((code, index) => ({ code, n: index + 1 })).filter(({ code }) => code.toLowerCase().includes(query))

  async function copy() {
    await navigator.clipboard.writeText(rule.activities.join('\n')) // one ID per line, ready to paste
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPIED_MS)
  }

  function download() {
    const csv = csvText(['Check', 'Activity ID'], rule.activities.map((code) => [rule.name, code]))
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = `${fileName.replace(/\.xer$/i, '')} - ${rule.name}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <section className="card activities" id="activities" aria-labelledby="activities-title" tabIndex={-1}>
      <div className="card-head">
        <div>
          <div className="label">Activities behind the number</div>
          <h2 id="activities-title">
            {rule.name}: {countText(rule.count, 'activity', 'activities')}
          </h2>
        </div>
        {rule.activities.length > 0 && (
          <div className="tools">
            <button type="button" className="button secondary small" onClick={copy}>
              {copied ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <Copy size={14} strokeWidth={2.25} aria-hidden />}
              {copied ? 'Copied' : 'Copy IDs'}
            </button>
            <button type="button" className="button secondary small" onClick={download}>
              <Download size={14} strokeWidth={2.25} aria-hidden />
              CSV
            </button>
          </div>
        )}
      </div>

      {rule.activities.length === 0 ? (
        <p className="hint">No activity breaks this rule.</p>
      ) : (
        <>
          <p className="hint">{ruleText(rule.name).action}</p>
          <label className="search">
            <Search size={15} strokeWidth={2.25} aria-hidden />
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by activity ID"
              aria-label="Filter by activity ID"
            />
          </label>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col" className="label">#</th>
                  <th scope="col" className="label">Activity ID</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ code, n }) => (
                  <tr key={n}>
                    <td className="num faint">{n}</td>
                    <td className="mono">{code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <p className="hint empty-filter">No activity ID matches “{filter}”.</p>}
          </div>
        </>
      )}
    </section>
  )
}
