import { useCallback, useSyncExternalStore } from "react"

/** Tailwind's `lg`: learners switch from the compact layout to the desktop one here. Keep in step with index.css. */
export const WIDE_QUERY = "(min-width: 64rem)"

export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
