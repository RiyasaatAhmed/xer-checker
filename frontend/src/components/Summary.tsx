/** The short written summary, and who wrote it. */
export function Summary({ points, author }: { points: string[]; author: string }) {
  return (
    <section className="card" aria-labelledby="summary-title">
      <h2 id="summary-title">Summary</h2>
      <ul className="points">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="hint">
        Written by {author}. Every number in it is filled in by code, not by the AI.
      </p>
    </section>
  )
}
