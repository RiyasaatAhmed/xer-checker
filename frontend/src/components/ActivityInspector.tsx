import { X } from 'lucide-react'
import { daysText, rangeText } from '../format'
import type { ActivityRow } from '../types'
import { LogicDiagram } from './LogicDiagram'

/** The activity picked on the dot grid: who it is, its float and dates, and its logic. */
export function ActivityInspector({ row, onClose }: { row: ActivityRow; onClose: () => void }) {
  return (
    <section className="inspector" aria-label={`Activity ${row.code}`}>
      <div className="inspector-head">
        <div className="who">
          <span className="who-top">
            <span className="id mono">{row.code}</span>
            <span className="name">{row.name}</span>
          </span>
          <span className="wbs">{row.wbs}</span>
        </div>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={15} aria-hidden />
        </button>
      </div>
      <p className="meta">
        <span>Float {daysText(row.float_days)} days</span>
        <span>{rangeText(row.start, row.finish)}</span>
        <span>{row.status}</span>
      </p>
      <LogicDiagram row={row} />
    </section>
  )
}
