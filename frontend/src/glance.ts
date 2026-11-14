// The first-scan facts beside the checks: can the file be trusted, how far along it is, and how old its status is.
// Pure functions on the backend's answer, so each can be tested alone.

import { SERIOUS } from './board'
import { dayText, daysBetween, plural } from './format'
import type { Overview, RowNote } from './types'

/** Broken rows and rows read with blanks. Any broken row makes the results partial:
 *  the reader can't always tell which table a stray line belonged to, so no table is ruled out. */
export function trustOf(file: { broken_rows: RowNote[]; notes: RowNote[] }): { broken: number; blanks: number; partial: boolean } {
  return { broken: file.broken_rows.length, blanks: file.notes.length, partial: file.broken_rows.length > 0 }
}

/** How far along the work is: complete and in progress, as counts and the share complete. Null with no overview. */
export function progressOf(overview: Overview | null | undefined): { complete: number; active: number; percent: number } | null {
  if (!overview || overview.activities === 0) return null
  const count = (key: string) => overview.by_status.find((p) => p.key === key)?.count ?? 0
  const complete = count('TK_Complete')
  return { complete, active: count('TK_Active'), percent: (100 * complete) / overview.activities }
}

/** Calendar days from the data date to the upload: how old the status in the file was. Null with no data date. */
export function statusAge(dataDate: string | null | undefined, uploadedAt: string): number | null {
  return dataDate ? daysBetween(dataDate, uploadedAt) : null
}

/** The verdict as one plain line, to paste into an email: the checks, the finish, and the data date. */
export function verdictLine(
  result: { file_name: string; rules: { status: string; severity?: number }[] },
  project: { name: string; data_date: string | null; deadline: string | null; forecast_finish: string | null } | undefined,
): string {
  const over = result.rules.filter((r) => r.status === 'flag')
  const runnable = result.rules.filter((r) => r.status !== 'n/a').length
  const serious = over.filter((r) => (r.severity ?? 1) >= SERIOUS).length
  const checks = runnable === 0 ? 'No check could run.' : over.length === 0 ? `All ${runnable} checks within the limit.` : `${over.length} of ${runnable} checks over the limit (${serious} serious).`
  const finish = project?.forecast_finish ? ` Finish ${dayText(project.forecast_finish)}${gapWords(project)}.` : ''
  const asOf = project?.data_date ? ` Data date ${dayText(project.data_date)}.` : ''
  return `${project?.name || result.file_name}: ${checks}${finish}${asOf}`
}

/** ", 10 days before the must-finish date", or nothing with no deadline. */
function gapWords(project: { deadline: string | null; forecast_finish: string | null }): string {
  if (!project.deadline || !project.forecast_finish) return ''
  const gap = daysBetween(project.deadline, project.forecast_finish)
  if (gap === 0) return ', on the must-finish date'
  return `, ${Math.abs(gap)} ${plural(Math.abs(gap), 'day')} ${gap > 0 ? 'after' : 'before'} the must-finish date`
}
