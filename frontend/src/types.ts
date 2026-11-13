// The answer from POST /api/uploads. Mirrors backend/modules/uploads/schema.py.

export type RuleStatus = 'pass' | 'flag' | 'n/a'

/** One DCMA rule's result. */
export interface RuleResult {
  name: string // like "Missing links"
  dcma_section: string // like "4.1"
  limit_percent: number // DCMA flags the schedule above this %
  count: number // activities that break the rule
  percent: number // count as a % of the activities checked, 1 decimal
  status: RuleStatus // n/a when nothing was checked
  activities: string[] // the activity IDs that break the rule
}

/** A row the checker couldn't use, or read with blanks. */
export interface RowNote {
  line: number
  message: string
}

/** Everything the checker found in one file. */
export interface CheckResult {
  file_name: string
  checked: number // unfinished work activities checked
  rules: RuleResult[]
  broken_rows: RowNote[]
  notes: RowNote[]
  summary: string[] // short points; every number in them is filled in by code
  summary_author: string // Gemini, or code and why
}
