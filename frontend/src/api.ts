import type { CheckActivities, CheckResult, UploadSummary } from './types'

// ---------- Constants ----------

export const UPLOADS_URL = '/api/uploads' // the backend, through the dev proxy or nginx
const NO_CONTENT = 204 // the status of an answer with no body
const SENDING_SHARE = 40 // % of the bar the browser's sending covers; the backend's stages cover 45 to 100
const POLL_MS = 250 // how often the page asks the backend how far an upload has got
const SENDING = 'Sending the file' // what the bar says while the browser sends it
const UNREACHABLE = "Can't reach the server. Is the backend running?"

/** A request that failed, with a message to show the user as is. */
export class UploadError extends Error {}

/** How far an upload has got: 1 to 100, and what is happening. */
export interface UploadProgress {
  percent: number
  stage: string
}

/** Send one .xer file to the backend. It's checked and saved; returns its results.
 *  onProgress hears the real progress: the bytes sent (1 to 40%), then each stage the backend reports (45 to 100%). */
export function uploadXer(file: File, onProgress: (progress: UploadProgress) => void = () => {}): Promise<CheckResult> {
  const body = new FormData()
  body.append('file', file) // the form field the backend reads
  const id = progressId()
  let shown = 0
  const tell = (percent: number, stage: string) => {
    const next = Math.min(100, Math.max(1, Math.round(percent)))
    if (next < shown) return // never backwards: a late answer can't undo a later stage
    shown = next
    onProgress({ percent: next, stage })
  }
  tell(1, SENDING)
  let waiting = true
  void (async () => {
    while (waiting) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      if (!waiting) return
      try {
        const answer = await fetch(`${UPLOADS_URL}/progress/${id}`)
        const found = answer.ok ? await answer.json() : null // 404 until the backend has the whole file
        if (waiting && typeof found?.percent === 'number') tell(found.percent, String(found.stage))
      } catch {
        // a missed question is fine: the next one comes in POLL_MS
      }
    }
  })()
  return new Promise<CheckResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest() // unlike fetch, it reports the bytes sent
    xhr.open('POST', UPLOADS_URL)
    xhr.setRequestHeader('X-Progress-Id', id)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) tell((event.loaded / event.total) * SENDING_SHARE, SENDING)
    }
    xhr.onload = () => {
      waiting = false
      if (xhr.status >= 200 && xhr.status < 300) {
        tell(100, 'Done')
        resolve(JSON.parse(xhr.responseText) as CheckResult)
      } else {
        reject(new UploadError(reasonIn(xhr.responseText, xhr.status)))
      }
    }
    xhr.onerror = () => {
      waiting = false
      reject(new UploadError(UNREACHABLE)) // no answer at all: the server is down
    }
    xhr.send(body)
  })
}

/** A random ID that names one upload, so the page can ask how far it has got. */
function progressId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `up-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}` // plain http on a LAN has no randomUUID
}

/** The newest saved uploads first, failed ones included. */
export function listUploads(): Promise<UploadSummary[]> {
  return request<UploadSummary[]>(UPLOADS_URL)
}

/** One saved upload's results. */
export function getUpload(uploadId: string): Promise<CheckResult> {
  return request<CheckResult>(`${UPLOADS_URL}/${encodeURIComponent(uploadId)}`)
}

/** Delete one saved upload with its results. */
export function deleteUpload(uploadId: string): Promise<void> {
  return request<void>(`${UPLOADS_URL}/${encodeURIComponent(uploadId)}`, { method: 'DELETE' })
}

/** The activities behind one check of one upload, with their logic. */
export function getCheck(uploadId: string, checkId: string): Promise<CheckActivities> {
  return request<CheckActivities>(`${UPLOADS_URL}/${encodeURIComponent(uploadId)}/checks/${encodeURIComponent(checkId)}`)
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
  if (response.status === NO_CONTENT) return undefined as T // a delete answers with no body
  return (await response.json()) as T
}

/** The backend's own reason ("can't be checked: the file is empty"), or the status code. */
async function errorMessage(response: Response): Promise<string> {
  return reasonIn(await response.text().catch(() => ''), response.status)
}

/** The reason in an error answer's text, as a sentence; the status code when it has none. */
function reasonIn(text: string, status: number): string {
  try {
    const data = JSON.parse(text)
    if (typeof data.detail === 'string') {
      const reason = data.detail.charAt(0).toUpperCase() + data.detail.slice(1)
      return /[.!?]$/.test(reason) ? reason : `${reason}.` // a sentence, so it reads well after other words
    }
  } catch {
    // not JSON, like an HTML error page from a proxy
  }
  return `The request failed (error ${status}).`
}
