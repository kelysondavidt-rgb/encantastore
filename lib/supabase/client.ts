import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables")
    // Return a dummy client or throw an error? 
    // Throwing is better to alert the developer, but for production it might crash the page.
    // However, without Supabase, the app is useless.
    throw new Error("Supabase URL and Key are required")
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
