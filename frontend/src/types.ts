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
  by_group?: Record<string, number> // activities flagged by at least one check of each group
  complete?: number // finished activities in the group
  total?: number // all activities in the group, checked or not
  heat?: number[][] // flagged activities starting in each month: heat[rule][month]
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
  kind?: string // which kind of this check's activities it is: a key in RuleResult.kinds
  fails?: number // how many checks flag it
  failed?: string[] // the IDs of the checks that flag it
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
  float_bands?: { key: string; label: string; count: number }[] // finer bands for the float picture
  lowest_float?: number | null // the least float of any checked activity, in days
  left_out?: { key: string; label: string; count: number }[] // activities DCMA leaves out, by reason
  driving_count?: number | null // checked activities at the lowest float: the driving path
  driving_wbs?: string | null // the WBS that holds most of the driving path
}

export type Measure = 'percent' | 'index' | 'test'

/** One kind of activity behind a check, with its color tone (a CSS class suffix). */
export interface Kind {
  key: string
  label: string
  tone: string
}

/** One check's result. Its activities come from getCheck. */
export interface RuleResult {
  id: string // a stable slug, like "missing-links"
  name: string // like "Missing links"
  group: string // Logic, Constraints, Float, Duration, Dates, Resources or Execution
  measure: Measure // a share of activities, a ratio, or pass or fail
  direction: 'above' | 'below' // flagged above the limit, or under it
  severity: number // 1 minor, 2 serious, 3 critical
  dcma_section: string // like "4.1"; blank for a check that isn't DCMA's
  limit_percent: number // the limit: a % of activities, or an index
  count: number // activities that break the rule
  percent: number // count as a % of the activities checked, 1 decimal
  status: RuleStatus // n/a when nothing was checked or the file can't support the check
  na_reason?: string | null // why the check could not run
  kinds: Kind[] // the kinds of activity behind this check
  activities?: string[] // empty in the upload answer; see getCheck
  details?: ActivityRow[]
}

/** The activities behind one check. */
export interface CheckActivities {
  id: string
  activities: string[] // the activity IDs, in the order the checker found them
  details: ActivityRow[]
}

/** The last earlier upload of the same file. */
export interface Previous {
  upload_id: string
  uploaded_at: string
  values: Record<string, number> // its percent for each check, by check ID
}

/** An activity with nothing after it, and the flagged activities that lead only into it. */
export interface OpenEnd {
  code: string
  name: string
  wbs: string
  clears: number
}

/** An activity that more than one check flags. */
export interface Repeat {
  code: string
  name: string
  wbs: string
  fails: number
  checks?: string[] // the IDs of the checks that flag it
}

/** Where one fix helps most. */
export interface FixFirst {
  open_ends: OpenEnd[]
  repeat_offenders: Repeat[]
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
  months?: string[] // the month axis of WbsGroup.heat, like "2026-07"
  previous?: Previous | null // the last earlier upload of the same file
  fix_first?: FixFirst
}

/** One check's status, for the strip on the upload list. */
export interface CheckStatus {
  id: string
  name: string
  group: string
  status: RuleStatus
  severity?: number // 1 minor, 2 serious, 3 critical
  percent?: number | null // the share of activities it flags; missing on an upload listed by an older backend
  count?: number | null // how many activities it flags
  limit_percent?: number | null
  na_reason?: string | null // why the check could not run
}

/** One upload in the list of recent uploads. */
export interface UploadSummary {
  upload_id: string
  uploaded_at: string // ISO date and time
  file_name: string
  status: 'ready' | 'failed'
  failure_reason: string | null // why the file couldn't be checked
  checked: number | null // null when the upload failed
  flags: number | null // checks over their limit; null when the upload failed
  broken_rows?: number | null // rows the checker couldn't use
  projects?: number | null // how many P6 projects the file holds
  checks?: CheckStatus[] // every check's status, in report order
  project?: string | null
  data_date?: string | null
  forecast_finish?: string | null
  deadline?: string | null
}
