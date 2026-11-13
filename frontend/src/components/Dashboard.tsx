import { useState } from 'react'
import type { CheckResult } from '../types'
import { FileIssues } from './FileIssues'
import { FlaggedActivities } from './FlaggedActivities'
import { RuleMeters } from './RuleMeters'
import { StatTiles } from './StatTiles'
import { Summary } from './Summary'

/** Everything about one checked file. */
export function Dashboard({ result }: { result: CheckResult }) {
  // Start with the first rule over its limit, so the list shows what needs a look.
  const first = result.rules.find((rule) => rule.status === 'flag') ?? result.rules[0]
  const [selected, setSelected] = useState(first?.name ?? '')
  const rule = result.rules.find((r) => r.name === selected)

  return (
    <div className="dashboard">
      <h1 className="file-name">{result.file_name}</h1>
      <StatTiles result={result} />
      <RuleMeters rules={result.rules} checked={result.checked} selected={selected} onSelect={setSelected} />
      <div className="columns">
        {rule && <FlaggedActivities rule={rule} />}
        <div className="stack">
          <Summary points={result.summary} author={result.summary_author} />
          <FileIssues broken={result.broken_rows} notes={result.notes} />
        </div>
      </div>
    </div>
  )
}
