import type { Store } from './store'
import { LocalStore } from './localStore'
import { SupabaseStore } from './supabaseStore'

/** Live mode when both Supabase settings are present, otherwise the local demo. */
let cached: Store | undefined
export function createStore(): Store {
  if (cached) return cached
  cached = build()
  return cached
}

function build(): Store {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && key) return new SupabaseStore(url, key)
  return new LocalStore()
}
