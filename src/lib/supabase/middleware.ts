import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: avoid writing logic between createServerClient and getUser().
  // A simple mistake could make it very hard to debug session refresh issues.
  // Wrapped in try/catch so a transient Supabase outage (e.g. a paused
  // project) degrades to "treat as logged out" instead of crashing the
  // middleware on every single request — which would take down the whole
  // site, including the error boundaries further down the request.
  let user = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (error) {
    console.error("Supabase auth check failed in middleware:", error);
  }

  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith("/app");
  const isAuthRoute = pathname === "/login" || pathname === "/cadastro";

  const isAlunoRoute = pathname.startsWith("/aluno");
  const isAlunoPublicRoute = pathname === "/aluno/login" || pathname === "/aluno/ativar";
  const isAlunoProtectedRoute = isAlunoRoute && !isAlunoPublicRoute;

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/hoje";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && isAlunoProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/aluno/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/aluno/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/aluno/inicio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return supabaseResponse as-is so cookies stay in sync.
  // If you need to change the response, copy cookies from supabaseResponse
  // before returning your new response.
  return supabaseResponse;
}
