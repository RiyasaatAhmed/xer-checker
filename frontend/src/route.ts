import { useCallback, useEffect, useState } from 'react'

// Each saved schedule has its own address, /uploads/<id>, and each check in it has one too,
// /uploads/<id>/checks/<check id>. Refresh, Back and a shared link all open the same view.
// "/" is the empty upload screen.

// ---------- Constants ----------

const UPLOAD_PATH = /^\/uploads\/([0-9a-f-]{36})(?:\/checks\/([a-z0-9-]+))?\/?$/i

export interface Route {
  uploadId: string | null
  checkId: string | null // the check picked in that upload, if the address names one
}

/** The upload and check in a path. Both are null for any other path. */
export function routeIn(path: string): Route {
  const match = UPLOAD_PATH.exec(path)
  return { uploadId: match?.[1] ?? null, checkId: match?.[2] ?? null }
}

/** The upload ID in a path, or null for any other path. */
export function uploadIdIn(path: string): string | null {
  return routeIn(path).uploadId
}

/** The path that opens one upload (and one of its checks), or the home path for null. */
export function pathFor(uploadId: string | null, checkId: string | null = null): string {
  if (!uploadId) return '/'
  return checkId ? `/uploads/${uploadId}/checks/${checkId}` : `/uploads/${uploadId}`
}

/** The route in the address bar, and a way to change it that adds a history entry. */
export function useUploadRoute(): [Route, (uploadId: string | null, checkId?: string | null) => void] {
  const [route, setRoute] = useState(() => routeIn(window.location.pathname))

  useEffect(() => {
    const onBack = () => setRoute(routeIn(window.location.pathname))
    window.addEventListener('popstate', onBack)
    return () => window.removeEventListener('popstate', onBack)
  }, [])

  const go = useCallback((uploadId: string | null, checkId: string | null = null) => {
    const next = pathFor(uploadId, checkId)
    if (next !== window.location.pathname) window.history.pushState(null, '', next)
    setRoute({ uploadId, checkId })
  }, [])

  return [route, go]
}
