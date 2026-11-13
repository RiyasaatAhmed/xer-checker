import { useCallback, useEffect, useRef, useState } from 'react'
import { UploadError, getUpload, listUploads, uploadXer } from './api'
import { Checking } from './components/Checking'
import { Dashboard } from './components/Dashboard'
import { DropOverlay } from './components/DropOverlay'
import { ErrorNotice } from './components/ErrorNotice'
import { Home } from './components/Home'
import { UploadButton } from './components/UploadButton'
import { useUploadRoute } from './route'
import type { CheckResult, UploadSummary } from './types'
import { fileProblem } from './validate'

// ---------- Constants ----------

const APP_NAME = 'XER checker'
const OPENING = 'Opening the saved check…'

type View =
  | { step: 'empty' }
  | { step: 'loading'; text: string }
  | { step: 'done'; result: CheckResult }
  | { step: 'failed'; message: string }

/** The page: upload a file, see what needs attention, open earlier checks again. */
export function App() {
  const [uploadId, go] = useUploadRoute()
  const [state, setView] = useState<View>(() => (uploadId ? { step: 'loading', text: OPENING } : { step: 'empty' }))
  const [uploads, setUploads] = useState<UploadSummary[] | null>(null) // null until the list has loaded
  const shownId = useRef<string | null>(null) // the upload on screen, so a fresh upload isn't fetched again

  // The list is a convenience: if it can't load, uploading still works.
  const refreshList = useCallback(() => {
    listUploads().then(setUploads, () => setUploads([]))
  }, [])
  useEffect(refreshList, [refreshList])

  // Open the check named in the address bar: on load, on Back and Forward, and from the list.
  useEffect(() => {
    if (uploadId === null) {
      shownId.current = null // Back to "/": the render below shows the empty screen
      return
    }
    if (shownId.current === uploadId) return
    let cancelled = false
    setView({ step: 'loading', text: OPENING })
    getUpload(uploadId).then(
      (result) => {
        if (cancelled) return
        shownId.current = result.upload_id
        setView({ step: 'done', result })
      },
      (error) => {
        if (!cancelled) setView({ step: 'failed', message: `Couldn’t open this check. ${messageOf(error)}` })
      },
    )
    return () => {
      cancelled = true
    }
  }, [uploadId])

  const title = state.step === 'done' && uploadId !== null ? `${state.result.file_name} · ${APP_NAME}` : APP_NAME
  useEffect(() => {
    document.title = title
  }, [title])

  async function check(file: File) {
    const problem = fileProblem(file)
    if (problem) {
      go(null)
      setView({ step: 'failed', message: problem })
      return
    }
    setView({ step: 'loading', text: `Checking ${file.name}…` })
    try {
      const result = await uploadXer(file)
      shownId.current = result.upload_id
      setView({ step: 'done', result })
      go(result.upload_id)
    } catch (error) {
      go(null)
      setView({ step: 'failed', message: messageOf(error) })
    }
    refreshList() // a failed upload is saved too, with its reason
  }

  function home(event: React.MouseEvent) {
    event.preventDefault()
    setView({ step: 'empty' })
    go(null)
  }

  // On "/" a finished result gives way to the empty screen (Back from a check, or the wordmark).
  const view = uploadId === null && state.step === 'done' ? ({ step: 'empty' } as View) : state
  const busy = view.step === 'loading'

  // A new page starts at its top: on a new address, and again once a check has drawn. Without it,
  // a check opened from the list at the foot of the page keeps that scroll, and the browser's
  // scroll anchoring holds the list in view while the check draws above it.
  const shownCheck = view.step === 'done' ? view.result.upload_id : null
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [uploadId, shownCheck])
  return (
    <div className="app">
      <DropOverlay onFile={check} />
      <header className="top">
        <div className="top-inner">
          <a href="/" className="wordmark" onClick={home}>
            {APP_NAME}
          </a>
          {/* On the home page the button sits in the page itself, so it isn't shown twice */}
          {view.step !== 'empty' && view.step !== 'failed' && <UploadButton busy={busy} onFile={check} />}
        </div>
      </header>

      <main className="main">
        {view.step === 'failed' && <ErrorNotice message={view.message} />}
        {view.step === 'loading' && <Checking text={view.text} />}
        {(view.step === 'empty' || view.step === 'failed') && <Home uploads={uploads} onFile={check} onOpen={go} />}
        {view.step === 'done' && (
          <>
            <a href="/" className="back" onClick={home}>
              ← All checks
            </a>
            {/* key: each upload starts a fresh dashboard, with its own selected rule */}
            <Dashboard key={view.result.upload_id} result={view.result} />
          </>
        )}
      </main>
    </div>
  )
}

/** A plain message for any error: the backend's own words when it sent them. */
function messageOf(error: unknown): string {
  return error instanceof UploadError ? error.message : 'Something went wrong. Please try again.'
}
