import { vi } from 'vitest'
import type { CheckResult, UploadSummary } from './types'

// The backend's answer for CSTv2.4.xer, cut down: the README numbers, with a few activity IDs.
export const CST_RESULT: CheckResult = {
  upload_id: '11111111-1111-4111-8111-111111111111',
  uploaded_at: '2026-11-14T03:07:55Z',
  file_name: 'CSTv2.4.xer',
  checked: 133,
  rules: [
    { name: 'Missing links', dcma_section: '4.1', limit_percent: 5, count: 20, percent: 15, status: 'flag', activities: ['ContractNo_CAL01', 'ContractNo_CAL03'] },
    { name: 'Negative float', dcma_section: '4.7', limit_percent: 0, count: 0, percent: 0, status: 'pass', activities: [] },
    { name: 'High float', dcma_section: '4.6', limit_percent: 5, count: 78, percent: 58.6, status: 'flag', activities: ['ContractNo_U350'] },
  ],
  broken_rows: [],
  notes: [],
  summary: ["Missing links: 20 of 133 activities (15.0%), over DCMA's 5% limit."],
  summary_author: 'code (no GEMINI_API_KEY; see .env.example)',
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
