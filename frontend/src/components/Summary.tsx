import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { verdictLine } from '../glance'
import type { CheckResult, ProjectInfo } from '../types'

// ---------- Constants ----------

const COPIED_MS = 2000 // how long the check mark shows on the copy button

interface Props {
  points: string[]
  author: string
  result: CheckResult
  project: ProjectInfo | undefined
}

/** The verdict as one line to copy into an email, and the written points behind a click. Says who wrote them. */
export function Summary({ points, author, result, project }: Props) {
  const [copied, setCopied] = useState(false)
  const byAi = author.startsWith('Gemini')
  const line = verdictLine(result, project)

  async function copy() {
    try {
      await navigator.clipboard.writeText(line)
    } catch {
      return // the browser refused, as it does on a plain-HTTP address: no check mark
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <section className="card summary-card" aria-label="Summary">
      <div className="summary-head">
        <p className="summary-line">{line}</p>
        <button type="button" className="icon-button" aria-label={copied ? 'Copied' : 'Copy the one-line verdict'} data-tip="Copy this line, to paste into an email" onClick={copy}>
          {copied ? <Check size={15} strokeWidth={2.5} aria-hidden /> : <Copy size={15} aria-hidden />}
        </button>
      </div>
      <details className="summary" open>
        <summary>
          <h2 id="summary-title">Summary</h2>
          <span className="pill info">{byAi ? 'Written by AI' : 'Written by code'}</span>
        </summary>
        <ul className="points">
          {points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
        <p className="hint small">
          {author}. Every number in it is filled in by code{byAi ? ', not by the AI' : ''}.
        </p>
      </details>
    </section>
  )
}
