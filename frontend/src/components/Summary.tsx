/** The short written summary, folded away: the picture comes first. Says who wrote it. */
export function Summary({ points, author }: { points: string[]; author: string }) {
  const byAi = author.startsWith('Gemini')
  return (
    <details className="card summary">
      <summary>
        <h2 id="summary-title">Summary</h2>
        <span className="pill info">{byAi ? 'Written by AI' : 'Written by code'}</span>
      </summary>
      <ul className="points">
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
      <p className="hint small">
        {author}. Every number in it is filled in by code{byAi ? ', not by the AI' : ''}.
      </p>
    </details>
  )
}
