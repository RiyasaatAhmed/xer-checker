/** The short written summary, who wrote it, and the promise that code put in every number. */
export function Summary({ points, author }: { points: string[]; author: string }) {
  const byAi = author.startsWith('Gemini')
  return (
    <section className="card summary" aria-labelledby="summary-title">
      <div className="card-head">
        <h2 id="summary-title">Summary</h2>
        <span className="pill info">{byAi ? 'Written by AI' : 'Written by code'}</span>
      </div>
      <ul className="points">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="hint small">
        {author}. Every number in it is filled in by code{byAi ? ', not by the AI' : ''}.
      </p>
    </section>
  )
}
