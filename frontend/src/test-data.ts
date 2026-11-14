import { vi } from 'vitest'
import type { ActivityRow, CheckActivities, CheckResult, Kind, RuleResult, UploadSummary, WbsGroup } from './types'

const MISSING_KINDS: Kind[] = [
  { key: 'both', label: 'Nothing before or after', tone: 'red' },
  { key: 'before', label: 'Nothing before', tone: 'amber' },
  { key: 'after', label: 'Nothing after', tone: 'violet' },
]
const ONE_KIND: Kind[] = [{ key: 'all', label: 'Flagged', tone: 's2' }]

/** One activity row, as the check's own call sends it. */
function row(code: string, name: string, float_days: number, predecessors: number, successors: number, fails = 1): ActivityRow {
  const next = [{ code: 'ContractNo_C100', name: 'Next activity', link_type: 'PR_FS', lag_hours: 16 }]
  return { code, name, wbs: 'Utility Notifications & Meetings', status: 'Not started', float_days, duration_days: 30,
    start: '2026-01-22T08:00:00', finish: '2026-02-20T16:00:00', predecessors, successors,
    before: predecessors > 0 ? [{ code: 'ContractNo_C050', name: 'Earlier activity', link_type: 'PR_FS', lag_hours: 0 }] : [],
    after: successors > 0 ? next : [], kind: predecessors === 0 && successors === 0 ? 'both' : predecessors === 0 ? 'before' : 'after', fails }
}

/** One check, as the upload answer sends it. */
function rule(id: string, name: string, group: string, over: Partial<RuleResult> = {}): RuleResult {
  return { id, name, group, measure: 'percent', direction: 'above', severity: 1, dcma_section: '4.1', limit_percent: 5, count: 0, percent: 0, status: 'pass', kinds: ONE_KIND, ...over }
}

/** One WBS group, as the API sends it. `flagged` counts the first check; the rest are filled so every check has a number. */
function group(id: string, parent_id: string | null, name: string, depth: number, checked: number, flagged: number, start: string, finish: string): WbsGroup {
  return { id, parent_id, name, depth, checked, flagged, by_rule: [flagged, 0, 0, 0, 0, 0, flagged, 0, 0, 0], by_group: { Logic: flagged, Float: flagged },
    complete: 0, total: checked, heat: Array.from({ length: 10 }, (_, i) => [0, 0, 0, 0, 0, 0, 0].map((_, m) => (i === 0 && m === 1 ? flagged : 0))), start, finish }
}

export const CST_RULES: RuleResult[] = [
  rule('missing-links', 'Missing links', 'Logic', { severity: 3, count: 20, percent: 15, status: 'flag', kinds: MISSING_KINDS }),
  rule('leads', 'Leads', 'Logic', { dcma_section: '4.2', limit_percent: 0 }),
  rule('lags', 'Lags', 'Logic', { dcma_section: '4.3', count: 1, percent: 0.8 }),
  rule('link-types', 'Link types', 'Logic', { dcma_section: '4.4', limit_percent: 10, count: 11, percent: 8.3 }),
  rule('hard-constraints', 'Hard constraints', 'Constraints', { dcma_section: '4.5', severity: 2 }),
  rule('negative-float', 'Negative float', 'Float', { dcma_section: '4.7', severity: 3, limit_percent: 0 }),
  rule('high-float', 'High float', 'Float', { dcma_section: '4.6', severity: 2, count: 78, percent: 58.6, status: 'flag' }),
  rule('long-durations', 'Long durations', 'Duration', { dcma_section: '4.8', count: 23, percent: 17.3, status: 'flag' }),
  rule('resources', 'Resources', 'Resources', { dcma_section: '4.10', limit_percent: 0, status: 'n/a', na_reason: 'The file has no resource assignments.' }),
  rule('bei', 'BEI', 'Execution', { dcma_section: '4.14', severity: 3, measure: 'index', direction: 'below', limit_percent: 0.95, status: 'n/a', na_reason: 'Needs a baseline schedule. The checker reads the current file only.' }),
]

/** The activities behind each check, as the check's own call sends them. High float is an older style: IDs only. */
export const CST_CHECKS: Record<string, CheckActivities> = {
  'missing-links': { id: 'missing-links', activities: ['ContractNo_CAL01', 'ContractNo_CAL03'],
    details: [row('ContractNo_CAL01', 'Calendar placeholder 1', 12, 0, 1, 1), row('ContractNo_CAL03', 'Calendar placeholder 3', 60, 1, 0, 3)] },
  'high-float': { id: 'high-float', activities: ['ContractNo_U350'], details: [] },
  'long-durations': { id: 'long-durations', activities: ['ContractNo_L1'], details: [row('ContractNo_L1', 'Long job', 5, 1, 1, 1)] },
}

// The backend's answer for CSTv2.4.xer, cut down: the README numbers, 10 checks, a few activities.
export const CST_RESULT: CheckResult = {
  upload_id: '11111111-1111-4111-8111-111111111111',
  uploaded_at: '2026-11-14T03:07:55Z',
  file_name: 'CSTv2.4.xer',
  checked: 133,
  rules: CST_RULES,
  broken_rows: [],
  notes: [],
  summary: ["Missing links: 20 of 133 activities (15.0%), over DCMA's 5% limit."],
  summary_author: 'code (no GEMINI_API_KEY; see .env.example)',
  projects: [{ name: 'CSTv2.4', data_date: '2026-01-01T00:00:00', planned_start: '2022-01-01T00:00:00', deadline: '2027-10-30T17:00:00', forecast_finish: '2027-10-20T16:00:00' }],
  overview: {
    activities: 145, checked: 133,
    by_status: [{ key: 'TK_NotStart', label: 'Not started', count: 145, percent: 100 }],
    by_type: [{ key: 'TT_Task', label: 'Task', count: 133, percent: 91.7 }, { key: 'TT_LOE', label: 'Level of effort', count: 12, percent: 8.3 }],
    links: 194, duplicate_links: 4,
    by_link_type: [{ key: 'PR_FS', label: 'Finish to start', count: 166, percent: 85.6 }, { key: 'PR_SF', label: 'Start to finish', count: 28, percent: 14.4 }],
    leads: 0, lags: 1, constraints: 5,
    by_constraint: [{ key: 'CS_MEOB', label: 'Finish on or before', count: 5, percent: 3.4 }],
    float_profile: [
      { key: 'negative', label: 'Below 0 days', count: 0 }, { key: 'zero', label: '0 days (critical)', count: 3 },
      { key: 'low', label: 'Up to 10 days', count: 33 }, { key: 'mid', label: '10 to 44 days', count: 19 }, { key: 'high', label: 'Over 44 days', count: 78 },
    ],
    float_bands: [
      { key: 'negative', label: 'Below 0', count: 0 }, { key: 'zero', label: '0', count: 3 }, { key: 'd1_5', label: '1 to 5', count: 10 }, { key: 'd6_10', label: '6 to 10', count: 23 },
      { key: 'd11_20', label: '11 to 20', count: 9 }, { key: 'd21_44', label: '21 to 44', count: 10 }, { key: 'd45_90', label: '45 to 90', count: 60 }, { key: 'd90', label: 'Over 90', count: 18 },
    ],
    lowest_float: 0,
    left_out: [{ key: 'loe', label: 'Level of effort', count: 12 }],
    no_float: 0,
  },
  structure: [
    group('r', null, 'CSTv2.4', 0, 133, 98, '2026-01-02T08:00:00', '2027-10-20T16:00:00'),
    group('u', 'r', 'Utility', 1, 40, 3, '2026-01-02T08:00:00', '2026-09-01T16:00:00'),
    group('u1', 'u', 'Utility Notifications & Meetings', 2, 4, 3, '2026-01-22T08:00:00', '2026-02-20T16:00:00'),
    group('p', 'r', 'Placeholder', 1, 20, 20, '2026-01-02T08:00:00', '2027-10-20T16:00:00'),
  ],
  months: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'],
  previous: { upload_id: '33333333-3333-4333-8333-333333333333', uploaded_at: '2026-11-01T00:00:00Z', values: { 'missing-links': 20, 'high-float': 62, 'long-durations': 17.3 } },
  fix_first: {
    open_ends: [{ code: 'ContractNo_CAL03', name: 'Calendar placeholder 3', wbs: 'Utility', clears: 5 }],
    repeat_offenders: [{ code: 'ContractNo_CAL01', name: 'Calendar placeholder 1', wbs: 'Utility', fails: 2 }],
  },
}

/** The same schedule with only the 3 checks the first version had, so every one is a row. */
export const SMALL_RESULT: CheckResult = { ...CST_RESULT, rules: CST_RULES.filter((r) => ['missing-links', 'negative-float', 'high-float'].includes(r.id)) }

/** The same schedule, but with `n` activities missing a link, all in one group: for paging. */
export function manyMissing(n: number): { result: CheckResult; checks: Record<string, CheckActivities> } {
  const codes = Array.from({ length: n }, (_, i) => `A${i + 1}`)
  const details = codes.map((code) => row(code, `Activity ${code}`, 10, 0, 1))
  return {
    result: { ...CST_RESULT, rules: CST_RULES.map((r) => (r.id === 'missing-links' ? { ...r, count: n } : r)) },
    checks: { ...CST_CHECKS, 'missing-links': { id: 'missing-links', activities: codes, details } },
  }
}

const STRIP = CST_RULES.map((r) => ({ id: r.id, name: r.name, group: r.group, status: r.status, severity: r.severity }))

// The upload list after one good upload and one that failed.
export const UPLOAD_LIST: UploadSummary[] = [
  { upload_id: CST_RESULT.upload_id, uploaded_at: CST_RESULT.uploaded_at, file_name: 'CSTv2.4.xer', status: 'ready', failure_reason: null, checked: 133, flags: 3, checks: STRIP,
    project: 'CSTv2.4', data_date: '2026-01-01T00:00:00', forecast_finish: '2027-10-20T16:00:00', deadline: '2027-10-30T17:00:00' },
  { upload_id: '22222222-2222-4222-8222-222222222222', uploaded_at: '2026-11-14T03:00:00Z', file_name: 'empty.xer', status: 'failed', failure_reason: 'the file is empty', checked: null, flags: null },
]

/** A fake fetch answer. */
export function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/**
 * A fake backend: GET /api/uploads lists `list`, POST answers `upload`, GET /api/uploads/{id} answers `result`,
 * and GET /api/uploads/{id}/checks/{check} answers from `checks` (404 for a check it doesn't have).
 */
export function fakeBackend(upload: () => Response, list: UploadSummary[] = [], result: CheckResult = CST_RESULT, checks: Record<string, CheckActivities> = CST_CHECKS) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return upload()
    if (url === '/api/uploads') return reply(200, list)
    const check = /\/checks\/([a-z0-9-]+)$/.exec(url)?.[1]
    if (check) return checks[check] ? reply(200, checks[check]) : reply(404, { detail: 'no such check in this upload' })
    return reply(200, result)
  })
}
