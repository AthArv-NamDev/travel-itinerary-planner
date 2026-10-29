import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && key)

// A placeholder URL keeps the app rendering (with a clear setup message) when env vars are missing.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-anon-key')
