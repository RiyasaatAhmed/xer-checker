import { threeOf } from '../board'
import { pathFor } from '../route'
import type { CheckResult } from '../types'
import { ThreeBadge } from './ThreeBadge'
import { ThreeChecks } from './ThreeChecks'

export interface Fresh {
  name: string // the file being checked
  result: CheckResult | null // null while it is checked
}

interface Props {
  fresh: Fresh
  onOpen: (uploadId: string) => void
}

/** The file just uploaded, drawn as the demo draws it: its row with a bar while it is checked, then its 3 checks.
 *  Once the file is in the saved list, the list shows it instead. */
export function LiveCheck({ fresh, onOpen }: Props) {
  const { name, result } = fresh
  const three = result ? threeOf(result.rules) : []
  return (
    <section className="live" aria-label="Latest check" aria-live="polite" aria-busy={result === null}>
      <div className={`live-file${result ? ' done' : ''}`}>
        <span className="live-xer" aria-hidden>
          <span />
        </span>
        {result ? (
          // Open in place, unless the user asked for a new tab or window
          <a
            className="live-name"
            href={pathFor(result.upload_id)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
              event.preventDefault()
              onOpen(result.upload_id)
            }}
          >
            {name}
          </a>
        ) : (
          <span className="live-name">{name}</span>
        )}
        {result ? (
          <ThreeBadge checks={three} />
        ) : (
          <span className="live-track" role="progressbar" aria-label="Checking">
            <span />
          </span>
        )}
      </div>
      {result && <ThreeChecks checks={three} />}
    </section>
  )
}
