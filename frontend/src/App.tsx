import { useCallback, useEffect, useState } from 'react'
import { UploadError, getUpload, listUploads, uploadXer } from './api'
import { Dashboard } from './components/Dashboard'
import { RecentUploads } from './components/RecentUploads'
import { UploadButton } from './components/UploadButton'
import type { CheckResult, UploadSummary } from './types'

type State =
  | { step: 'empty' }
  | { step: 'loading'; text: string }
  | { step: 'done'; result: CheckResult }
  | { step: 'failed'; message: string }

/** The page: one upload button, the results of the open file, and the recent uploads. */
export function App() {
  const [state, setState] = useState<State>({ step: 'empty' })
  const [uploads, setUploads] = useState<UploadSummary[]>([])

  // The list is a convenience: if it can't load, the upload button still works.
  const refreshList = useCallback(() => {
    listUploads().then(setUploads, () => setUploads([]))
  }, [])
  useEffect(refreshList, [refreshList])

  /** Show what `load` returns, or its error in plain words. */
  async function show(text: string, load: () => Promise<CheckResult>) {
    setState({ step: 'loading', text })
    try {
      setState({ step: 'done', result: await load() })
    } catch (error) {
      const message = error instanceof UploadError ? error.message : 'Something went wrong. Please try again.'
      setState({ step: 'failed', message })
    }
  }

  async function check(file: File) {
    await show(`Checking ${file.name}…`, () => uploadXer(file))
    refreshList() // a failed upload is saved too, with its reason
  }

  const openId = state.step === 'done' ? state.result.upload_id : null
  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="brand">XER checker</div>
          <div className="tagline">Checks a Primavera P6 schedule against DCMA rules</div>
        </div>
        <UploadButton busy={state.step === 'loading'} onFile={check} />
      </header>

      <main className="main">
        <div aria-live="polite">{state.step === 'loading' && <p className="status">{state.text}</p>}</div>
        {state.step === 'failed' && (
          <p className="error" role="alert">
            {state.message}
          </p>
        )}
        {state.step === 'empty' && (
          <div className="empty">
            <h1>Upload a P6 schedule</h1>
            <p>Export the schedule from P6 as a .xer file, then upload it.</p>
            <p>You’ll see missing links, negative float and high float, each against DCMA’s limit.</p>
          </div>
        )}
        {/* key: each upload starts a fresh dashboard, with its own selected rule */}
        {state.step === 'done' && <Dashboard key={state.result.upload_id} result={state.result} />}
        <RecentUploads uploads={uploads} openId={openId} onOpen={(id) => show('Opening…', () => getUpload(id))} />
      </main>
    </div>
  )
}
