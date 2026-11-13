// The backend's answers. Mirrors backend/modules/uploads/schema.py.

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

/** Everything the checker found in one file, as saved. */
export interface CheckResult {
  upload_id: string // open it again with GET /api/uploads/{upload_id}
  uploaded_at: string // ISO date and time
  file_name: string
  checked: number // unfinished work activities checked
  rules: RuleResult[]
  broken_rows: RowNote[]
  notes: RowNote[]
  summary: string[] // short points; every number in them is filled in by code
  summary_author: string // Gemini, or code and why
}

/** One upload in the list of recent uploads. */
export interface UploadSummary {
  upload_id: string
  uploaded_at: string // ISO date and time
  file_name: string
  status: 'ready' | 'failed'
  failure_reason: string | null // why the file couldn't be checked
  checked: number | null // null when the upload failed
  flags: number | null // rules over their DCMA limit; null when the upload failed
}
