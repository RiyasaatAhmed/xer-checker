import type { CheckResult, UploadSummary } from './types'

// ---------- Constants ----------

export const UPLOADS_URL = '/api/uploads' // the backend, through the dev proxy or nginx
const UNREACHABLE = "Can't reach the server. Is the backend running?"

/** A request that failed, with a message to show the user as is. */
export class UploadError extends Error {}

/** Send one .xer file to the backend. It's checked and saved; returns its results. */
export function uploadXer(file: File): Promise<CheckResult> {
  const body = new FormData()
  body.append('file', file) // the form field the backend reads
  return request<CheckResult>(UPLOADS_URL, { method: 'POST', body })
}

/** The newest saved uploads first, failed ones included. */
export function listUploads(): Promise<UploadSummary[]> {
  return request<UploadSummary[]>(UPLOADS_URL)
}

/** One saved upload's results. */
export function getUpload(uploadId: string): Promise<CheckResult> {
  return request<CheckResult>(`${UPLOADS_URL}/${encodeURIComponent(uploadId)}`)
}

/** fetch, with every failure turned into an UploadError with a plain message. */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    throw new UploadError(UNREACHABLE) // no answer at all: the server is down
  }
  if (!response.ok) {
    throw new UploadError(await errorMessage(response))
  }
  return (await response.json()) as T
}

/** The backend's own reason ("can't be checked: the file is empty"), or the status code. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json()
    if (typeof data.detail === 'string') {
      return data.detail.charAt(0).toUpperCase() + data.detail.slice(1)
    }
  } catch {
    // not JSON, like an HTML error page from a proxy
  }
  return `The request failed (error ${response.status}).`
}
