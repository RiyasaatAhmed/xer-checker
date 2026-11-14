// The backend's answers. Mirrors backend/modules/uploads/schema.py.

export type RuleStatus = 'pass' | 'flag' | 'n/a'

/** An activity one link away from another. */
export interface Neighbor {
  code: string
  name: string
  link_type: string // PR_FS, PR_SS, PR_FF or PR_SF
  lag_hours: number // below 0 is a lead, above 0 a lag
}

/** One WBS group with its subtree's numbers. Mirrors WbsGroup in the backend. */
export interface WbsGroup {
  id: string
  parent_id: string | null // null for the root
  name: string
  depth: number // 0 for the root
  checked: number // activities DCMA checks, in this group and the groups inside it
  flagged: number // how many of those any rule flags
  by_rule: number[] // flagged per rule, in the order of CheckResult.rules
  start: string | null // earliest start; site-local, no time zone
  finish: string | null // latest finish
}

/** One activity behind a number, as a scheduler finds it in P6. Dates are site-local, with no time zone. */
export interface ActivityRow {
  code: string
  name: string
  wbs: string // the WBS element's name
  status: string // Not started, In progress or Complete
  float_days: number | null // total float, working days on its own calendar
  duration_days: number | null // remaining duration, working days
  predecessors: number // links into it: 0 means nothing comes before it
  successors: number // links out of it: 0 means nothing comes after it
  before: Neighbor[] // up to 4 of the activities linked before it
  after: Neighbor[] // up to 4 of the activities linked after it
  start: string | null // actual start, else early start
  finish: string | null // actual finish, else early finish
}

/** One P6 project in the file. */
export interface ProjectInfo {
  name: string
  data_date: string | null // the "as of" date
  planned_start: string | null
  deadline: string | null // often blank
  forecast_finish: string | null
}

/** One slice of a total: a status, a type, a link type. */
export interface Part {
  key: string // P6's code, like TK_Active or PR_FS
  label: string
  count: number
  percent: number // of its own total, 1 decimal
}

/** What's in the schedule, counted: facts from the file, not pass or fail. */
export interface Overview {
  activities: number
  checked: number // the activities DCMA checks
  by_status: Part[]
  by_type: Part[]
  links: number // one per pair of activities
  duplicate_links: number // rows linking a pair twice; the later row is counted
  by_link_type: Part[]
  leads: number
  lags: number
  constraints: number
  by_constraint: Part[]
  float_profile: { key: string; label: string; count: number }[] // the checked activities by total float
  no_float: number
}

/** One DCMA rule's result. */
export interface RuleResult {
  name: string // like "Missing links"
  dcma_section: string // like "4.1"
  limit_percent: number // DCMA flags the schedule above this %
  count: number // activities that break the rule
  percent: number // count as a % of the activities checked, 1 decimal
  status: RuleStatus // n/a when nothing was checked
  activities: string[] // the activity IDs that break the rule
  details?: ActivityRow[] // the same activities with name, WBS, float and dates; missing on older uploads
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
  projects?: ProjectInfo[] // missing on older uploads
  overview?: Overview | null
  structure?: WbsGroup[] // the WBS tree in tree order; missing on older uploads
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
