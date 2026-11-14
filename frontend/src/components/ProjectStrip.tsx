import { countText, dayText, daysBetween } from '../format'
import type { ProjectInfo } from '../types'

/** The project's key dates, as P6 wrote them: the data date, the start, the forecast finish and the deadline. */
export function ProjectStrip({ project, more }: { project: ProjectInfo; more: number }) {
  const gap = project.deadline && project.forecast_finish ? daysBetween(project.forecast_finish, project.deadline) : null
  const dates = [
    { label: 'Data date', value: project.data_date },
    { label: 'Planned start', value: project.planned_start },
    { label: 'Forecast finish', value: project.forecast_finish },
    { label: 'Deadline', value: project.deadline },
  ]
  return (
    <section className="project" aria-label="Project dates">
      <div className="project-name">
        <span className="label">P6 project</span>
        <span className="project-id mono">{project.name}</span>
        {more > 0 && <span className="hint small">and {countText(more, 'more project')} in this file</span>}
      </div>
      <dl className="project-dates">
        {dates.map((d) => (
          <div key={d.label}>
            <dt className="label">{d.label}</dt>
            <dd className="num">{d.value ? dayText(d.value) : '–'}</dd>
          </div>
        ))}
      </dl>
      {gap !== null && (
        <p className={`project-gap ${gap >= 0 ? 'ahead' : 'behind'}`}>
          {gap >= 0
            ? `Forecast to finish ${countText(gap, 'day')} before the deadline.`
            : `Forecast to finish ${countText(-gap, 'day')} after the deadline.`}
        </p>
      )}
    </section>
  )
}
