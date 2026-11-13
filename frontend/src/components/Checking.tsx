/** While a file is checked or a saved check opens. The bar has no fake percent: the wait is short and unknown. */
export function Checking({ text }: { text: string }) {
  return (
    <section className="card checking" aria-live="polite" aria-busy="true">
      <div className="eyebrow">Working</div>
      <p className="checking-title">{text}</p>
      <div className="progress" aria-hidden="true">
        <span />
      </div>
      <p className="hint">Reading the file, running the DCMA checks and writing the summary. Most files take a few seconds.</p>
    </section>
  )
}
