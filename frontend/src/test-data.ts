import { vi } from 'vitest'
import type { ActivityRow, CheckResult, UploadSummary } from './types'

/** One activity row, as the API sends it. */
function row(code: string, name: string, float_days: number, predecessors: number, successors: number): ActivityRow {
  return { code, name, wbs: 'Utility Notifications & Meetings', status: 'Not started', float_days, duration_days: 30,
    start: '2026-01-22T08:00:00', finish: '2026-02-20T16:00:00', predecessors, successors }
}

// The backend's answer for CSTv2.4.xer, cut down: the README numbers, with a few activities.
export const CST_RESULT: CheckResult = {
  upload_id: '11111111-1111-4111-8111-111111111111',
  uploaded_at: '2026-11-14T03:07:55Z',
  file_name: 'CSTv2.4.xer',
  checked: 133,
  rules: [
    { name: 'Missing links', dcma_section: '4.1', limit_percent: 5, count: 20, percent: 15, status: 'flag', activities: ['ContractNo_CAL01', 'ContractNo_CAL03'],
      details: [row('ContractNo_CAL01', 'Calendar placeholder 1', 12, 0, 1), row('ContractNo_CAL03', 'Calendar placeholder 3', 60, 1, 0)] },
    { name: 'Negative float', dcma_section: '4.7', limit_percent: 0, count: 0, percent: 0, status: 'pass', activities: [] },
    { name: 'High float', dcma_section: '4.6', limit_percent: 5, count: 78, percent: 58.6, status: 'flag', activities: ['ContractNo_U350'] },
  ],
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
    no_float: 0,
  },
}

// The upload list after one good upload and one that failed.
export const UPLOAD_LIST: UploadSummary[] = [
  { upload_id: CST_RESULT.upload_id, uploaded_at: CST_RESULT.uploaded_at, file_name: 'CSTv2.4.xer', status: 'ready', failure_reason: null, checked: 133, flags: 2 },
  { upload_id: '22222222-2222-4222-8222-222222222222', uploaded_at: '2026-11-14T03:00:00Z', file_name: 'empty.xer', status: 'failed', failure_reason: 'the file is empty', checked: null, flags: null },
]

/** A fake fetch answer. */
export function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** A fake backend: GET /api/uploads lists `list`, POST answers `upload`, GET /api/uploads/{id} answers CST_RESULT. */
export function fakeBackend(upload: () => Response, list: UploadSummary[] = []) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return upload()
    if (url === '/api/uploads') return reply(200, list)
    return reply(200, CST_RESULT)
  })
}
