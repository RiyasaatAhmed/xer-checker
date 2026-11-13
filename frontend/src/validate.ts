// Checks a file in the browser before it's sent, so an obvious mistake gets an answer at once.
// The backend still checks everything; these only catch the wrong file type and size.

// ---------- Constants ----------

export const MAX_UPLOAD_MB = 50 // the backend's own limit
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
const XER = /\.xer$/i // P6's export extension

/** Why this file can't be uploaded, or null when it can. */
export function fileProblem(file: File): string | null {
  if (!XER.test(file.name)) {
    return `${file.name} isn't a .xer file. Export the schedule from P6 as XER, then upload that file.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is over ${MAX_UPLOAD_MB} MB, the largest file the checker takes.`
  }
  return null
}
