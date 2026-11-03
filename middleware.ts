import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const publicPaths = ["/login"];
const roleRoutes: { prefix: string; role: Database["public"]["Enums"]["user_role"] }[] = [
  { prefix: "/operator", role: "operator" },
  { prefix: "/juri", role: "juri" },
  { prefix: "/panitia", role: "panitia" },
  { prefix: "/pendamping", role: "pendamping_regu" },
  { prefix: "/api/pendamping", role: "pendamping_regu" },
  { prefix: "/dashboard", role: "peserta" },
  { prefix: "/leaderboard", role: "peserta" },
  { prefix: "/scan-task", role: "peserta" },
  { prefix: "/score-recap", role: "peserta" },
  { prefix: "/profile", role: "peserta" },
];

function isPublicPath(pathname: string) {
  return (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    ) || pathname === "/verify" || pathname.startsWith("/verify/")
  );
}

function requiredRoleForPath(pathname: string) {
  return roleRoutes.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.role;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/register") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("setup", "required");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Gagal memvalidasi sesi Supabase.", error.message);
  }

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isPublicPath(request.nextUrl.pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Gagal memvalidasi role akun.", profileError.message);
      return new NextResponse("Hak akses akun gagal diverifikasi.", {
        status: 503,
      });
    }
    if (!profile || !profile.is_active) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Akun tidak aktif atau profil tidak tersedia." },
          { status: 403 },
        );
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("access", "disabled");
      return NextResponse.redirect(loginUrl);
    }
    const requiredRole = requiredRoleForPath(request.nextUrl.pathname);
    if (requiredRole && profile.role !== requiredRole) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Role akun tidak diizinkan mengakses endpoint ini." },
          { status: 403 },
        );
      }
      const homeByRole: Record<
        Database["public"]["Enums"]["user_role"],
        string
      > = {
        operator: "/operator",
        panitia: "/panitia/dashboard",
        juri: "/juri/dashboard",
        peserta: "/dashboard",
        pendamping_regu: "/pendamping/dashboard",
      };
      const landingUrl = request.nextUrl.clone();
      landingUrl.pathname = homeByRole[profile.role];
      landingUrl.search = "";
      return NextResponse.redirect(landingUrl);
    }
  }

  if (user && request.nextUrl.pathname === "/login") {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Gagal memvalidasi status akun.", profileError.message);
      return new NextResponse("Status akun gagal diverifikasi.", {
        status: 503,
      });
    }
    if (profile?.is_active && profile.role) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = {
        operator: "/operator",
        panitia: "/panitia/dashboard",
        juri: "/juri/dashboard",
        peserta: "/dashboard",
        pendamping_regu: "/pendamping/dashboard",
      }[profile.role];
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
