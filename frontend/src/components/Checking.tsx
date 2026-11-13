/** While a file is checked or a saved check opens. The bar has no fake percent: the wait is short and unknown. */
export function Checking({ text }: { text: string }) {
  return (
    <section className="checking" aria-live="polite" aria-busy="true">
      <p className="checking-title">{text}</p>
      <div className="progress" aria-hidden="true">
        <span />
      </div>
    </section>
  )
}
