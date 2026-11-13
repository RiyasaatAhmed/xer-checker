import type { CheckResult } from './types'

// ---------- Constants ----------

export const UPLOAD_URL = '/api/uploads' // the backend, through the dev proxy or nginx
const UNREACHABLE = "Can't reach the server. Is the backend running?"

/** An upload that failed, with a message to show the user as is. */
export class UploadError extends Error {}

/** Send one .xer file to the backend, and return its results. Throws UploadError with a plain message. */
export async function uploadXer(file: File): Promise<CheckResult> {
  const body = new FormData()
  body.append('file', file) // the form field the backend reads
  let response: Response
  try {
    response = await fetch(UPLOAD_URL, { method: 'POST', body })
  } catch {
    throw new UploadError(UNREACHABLE) // no answer at all: the server is down
  }
  if (!response.ok) {
    throw new UploadError(await errorMessage(response))
  }
  return (await response.json()) as CheckResult
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
  return `The upload failed (error ${response.status}).`
}
