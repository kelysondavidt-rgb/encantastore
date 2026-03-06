import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Only create the client if env vars are present to avoid crashes
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
              )
            },
          },
        },
      )
      
      // Refresh session if needed (optional, but good practice if using Supabase Auth)
      await supabase.auth.getUser()
    } catch (error) {
      console.error("Middleware Supabase error:", error)
      // Continue execution even if Supabase fails, to avoid 500 errors
    }
  }

  // Check if user is authenticated by checking custom cookie
  const userCookie = request.cookies.get("user_authenticated")
  const pathname = request.nextUrl.pathname

  // If not authenticated and trying to access protected routes
  if (!userCookie && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If authenticated and trying to access login page
  if (userCookie && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return supabaseResponse
}
