import { useCallback, useEffect, useState } from 'react'

// Each saved schedule's report has its own address, /report/<id>, and each check in it has one too,
// /report/<id>/checks/<check id>. Refresh, Back and a shared link all open the same view.
// An older /uploads/<id> link still opens: the address bar then moves to /report/<id>.
// "/" is the home page.

// ---------- Constants ----------

const REPORT_PATH = /^\/(?:report|uploads)\/([0-9a-f-]{36})(?:\/checks\/([a-z0-9-]+))?\/?$/i // "uploads": links made before /report

export interface Route {
  uploadId: string | null
  checkId: string | null // the check picked in that upload, if the address names one
}

/** The upload and check in a path. Both are null for any other path. */
export function routeIn(path: string): Route {
  const match = REPORT_PATH.exec(path)
  return { uploadId: match?.[1] ?? null, checkId: match?.[2] ?? null }
}

/** The upload ID in a path, or null for any other path. */
export function uploadIdIn(path: string): string | null {
  return routeIn(path).uploadId
}

/** The path that opens one upload's report (and one of its checks), or the home path for null. */
export function pathFor(uploadId: string | null, checkId: string | null = null): string {
  if (!uploadId) return '/'
  return checkId ? `/report/${uploadId}/checks/${checkId}` : `/report/${uploadId}`
}

/** The route in the address bar, and a way to change it that adds a history entry. */
export function useUploadRoute(): [Route, (uploadId: string | null, checkId?: string | null) => void] {
  const [route, setRoute] = useState(() => routeIn(window.location.pathname))

  useEffect(() => {
    const read = () => {
      const now = routeIn(window.location.pathname)
      const canonical = pathFor(now.uploadId, now.checkId)
      if (now.uploadId && canonical !== window.location.pathname) window.history.replaceState(null, '', canonical) // an old /uploads link
      setRoute(now)
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  const go = useCallback((uploadId: string | null, checkId: string | null = null) => {
    const next = pathFor(uploadId, checkId)
    if (next !== window.location.pathname) window.history.pushState(null, '', next)
    setRoute({ uploadId, checkId })
  }, [])

  return [route, go]
}
