import { countText } from '../format'
import type { RuleResult } from '../types'

/** The activity IDs behind one rule's number. */
export function FlaggedActivities({ rule }: { rule: RuleResult }) {
  return (
    <section className="card" aria-labelledby="activities-title">
      <h2 id="activities-title">
        {rule.name}: {countText(rule.count, 'activity', 'activities')}
      </h2>
      {rule.activities.length === 0 ? (
        <p className="hint">No activity breaks this rule.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Activity ID</th>
              </tr>
            </thead>
            <tbody>
              {rule.activities.map((code, index) => (
                <tr key={code}>
                  <td className="number">{index + 1}</td>
                  <td>{code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
