import type { UploadProgress } from '../api'
import { pathFor } from '../route'
import type { CheckResult } from '../types'
import { ChecksBadge } from './ChecksBadge'
import { CheckBars } from './CheckBars'

export interface Fresh {
  name: string // the file being checked
  result: CheckResult | null // null while it is checked
  progress?: UploadProgress // how far it has got while it is checked: 1 to 100
}

interface Props {
  fresh: Fresh
  onOpen: (uploadId: string) => void
}

/** The file just uploaded, drawn as the demo draws it: its row with a bar across its full width while it is checked,
 *  then every check, by set. Once the file is in the saved list, the list shows it instead. */
export function LiveCheck({ fresh, onOpen }: Props) {
  const { name, result } = fresh
  const progress = fresh.progress ?? { percent: 1, stage: 'Sending the file' }
  const checks = result?.rules ?? []
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
          <ChecksBadge checks={checks} />
        ) : (
          <span className="live-stage">
            {progress.stage} <b className="num">{progress.percent}%</b>
          </span>
        )}
        {!result && (
          <span className="live-track" role="progressbar" aria-label={`Checking ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-valuetext={`${progress.percent}%, ${progress.stage}`}>
            <span style={{ width: `${progress.percent}%` }} />
          </span>
        )}
      </div>
      {result && <CheckBars checks={checks} />}
    </section>
  )
}
