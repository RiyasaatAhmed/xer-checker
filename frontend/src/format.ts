// Small text helpers, shared by the components.

/** 15 -> "15.0%". */
export function percentText(value: number): string {
  return `${value.toFixed(1)}%`
}

/** (1, "row") -> "1 row", (7, "row") -> "7 rows", (2, "activity", "activities") -> "2 activities". */
export function countText(count: number, noun: string, plural = `${noun}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? noun : plural}`
}
