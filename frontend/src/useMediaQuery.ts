import { useSyncExternalStore } from 'react'

/** True while the screen matches a CSS media query, like "(max-width: 760px)". False where there is no matchMedia. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia?.(query)
      list?.addEventListener('change', notify)
      return () => list?.removeEventListener('change', notify)
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  )
}
