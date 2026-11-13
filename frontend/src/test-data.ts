import type { CheckResult } from './types'

// The backend's answer for CSTv2.4.xer, cut down: the README numbers, with a few activity IDs.
export const CST_RESULT: CheckResult = {
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

/** A fake fetch answer. */
export function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
