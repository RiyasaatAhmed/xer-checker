import { useState } from 'react'
import { UploadError, uploadXer } from './api'
import { Dashboard } from './components/Dashboard'
import { UploadButton } from './components/UploadButton'
import type { CheckResult } from './types'

type State =
  | { step: 'empty' }
  | { step: 'checking'; fileName: string }
  | { step: 'done'; result: CheckResult }
  | { step: 'failed'; message: string }

/** The page: one upload button, then the results of the last file. */
export function App() {
  const [state, setState] = useState<State>({ step: 'empty' })

  async function check(file: File) {
    setState({ step: 'checking', fileName: file.name })
    try {
      setState({ step: 'done', result: await uploadXer(file) })
    } catch (error) {
      const message = error instanceof UploadError ? error.message : 'Something went wrong. Please try again.'
      setState({ step: 'failed', message })
    }
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <div className="brand">XER checker</div>
          <div className="tagline">Checks a Primavera P6 schedule against DCMA rules</div>
        </div>
        <UploadButton busy={state.step === 'checking'} onFile={check} />
      </header>

      <main>
        <div aria-live="polite">
          {state.step === 'checking' && <p className="status">Checking {state.fileName}…</p>}
        </div>
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
        {/* key: a new file starts a fresh dashboard, with its own selected rule */}
        {state.step === 'done' && <Dashboard key={state.result.file_name} result={state.result} />}
      </main>
    </div>
  )
}
