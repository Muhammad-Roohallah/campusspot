import { useEffect, useState } from 'react'

/** Hash routing (#/library/G/A) so the app works on GitHub Pages without server rewrites. */
export function useRoute(): string[] {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [parts, setParts] = useState<string[]>(read)
  useEffect(() => {
    const on = () => setParts(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parts
}
export const go = (path: string) => { location.hash = '#/' + path }
