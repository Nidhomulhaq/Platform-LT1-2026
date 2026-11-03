import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginIdToAuthEmail } from "@/lib/auth/login-id";
import { adminRequest, SupabaseAdminError } from "@/lib/supabase/admin-server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureSameOrigin(request: NextRequest) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function getCompanion() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !publishableKey) {
    return {
      error: jsonResponse({ error: "Konfigurasi Supabase belum tersedia." }, 503),
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(projectUrl, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: jsonResponse({ error: "Sesi login tidak valid." }, 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,is_active,school_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Gagal memeriksa hak akses Pendamping Regu.", profileError.message);
    return {
      error: jsonResponse(
        { error: "Hak akses gagal diverifikasi. Pastikan migration terbaru sudah diterapkan." },
        500,
      ),
    };
  }
  if (profile?.role !== "pendamping_regu" || !profile.is_active) {
    return {
      error: jsonResponse(
        { error: "Hanya Pendamping Regu aktif yang dapat mendaftarkan peserta." },
        403,
      ),
    };
  }
  if (!profile.school_id) {
    return {
      error: jsonResponse(
        { error: "Akun pendamping belum memiliki pangkalan. Hubungi Operator." },
        409,
      ),
    };
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("pendamping_id", user.id)
    .maybeSingle();
  if (teamError) {
    console.error("Gagal memeriksa penugasan regu Pendamping.", teamError.message);
    return {
      error: jsonResponse(
        { error: "Penugasan regu gagal diverifikasi. Pastikan migration terbaru sudah diterapkan." },
        500,
      ),
    };
  }
  if (!team) {
    return {
      error: jsonResponse(
        { error: "Belum ada regu yang ditugaskan kepada akun ini." },
        409,
      ),
    };
  }

  return {
    projectUrl,
    teamId: team.id,
    schoolId: profile.school_id,
  };
}

function createLoginId(fullName: string) {
  const base =
    fullName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 52)
      .replace(/[.-]+$/g, "") || "peserta";
  return `${base}.${randomBytes(5).toString("hex")}`;
}

async function deleteCreatedUser(projectUrl: string, userId: string) {
  try {
    await adminRequest(
      projectUrl,
      `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      "DELETE",
    );
  } catch (error) {
    console.error(
      "Akun peserta yang gagal diprovisikan tidak dapat dibersihkan.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
  }
}

export async function POST(request: NextRequest) {
  if (!ensureSameOrigin(request)) {
    return jsonResponse({ error: "Permintaan lintas situs ditolak." }, 403);
  }

  const companion = await getCompanion();
  if ("error" in companion) return companion.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Data pendaftaran tidak valid." }, 400);
  }
  if (!isRecord(body) || typeof body.fullName !== "string") {
    return jsonResponse({ error: "Nama peserta wajib diisi." }, 400);
  }

  const fullName = body.fullName.trim();
  if (!fullName || fullName.length > 150) {
    return jsonResponse(
      { error: "Nama peserta harus berisi 1–150 karakter." },
      400,
    );
  }

  let createdUserId = "";
  const loginId = createLoginId(fullName);
  const temporaryPassword = randomBytes(24).toString("base64url");
  try {
    const email = loginIdToAuthEmail(loginId);
    const createdUser = await adminRequest(
      companion.projectUrl,
      "/auth/v1/admin/users",
      "POST",
      {
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      },
    );
    const userRecord =
      isRecord(createdUser) && isRecord(createdUser.user)
        ? createdUser.user
        : createdUser;
    if (!isRecord(userRecord) || typeof userRecord.id !== "string") {
      throw new Error("Supabase tidak mengembalikan ID akun peserta.");
    }
    createdUserId = userRecord.id;

    const profileQuery = new URLSearchParams({ id: `eq.${createdUserId}` });
    const profileResult = await adminRequest(
      companion.projectUrl,
      `/rest/v1/profiles?${profileQuery}`,
      "PATCH",
      {
        full_name: fullName,
        login_id: loginId,
        role: "peserta",
        school_id: companion.schoolId,
        is_active: true,
      },
      "return=representation",
    );
    if (!Array.isArray(profileResult) || profileResult.length !== 1) {
      throw new Error("Profil peserta gagal dibuat atau tidak ditemukan.");
    }

    await adminRequest(
      companion.projectUrl,
      "/rest/v1/team_members",
      "POST",
      {
        user_id: createdUserId,
        team_id: companion.teamId,
        is_pinru: false,
      },
      "return=representation",
    );

    return jsonResponse(
      { fullName, loginId, temporaryPassword },
      201,
    );
  } catch (error) {
    if (createdUserId) {
      await deleteCreatedUser(companion.projectUrl, createdUserId);
    }
    console.error(
      "Gagal mendaftarkan akun peserta.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Akun peserta gagal dibuat.",
      },
      error instanceof SupabaseAdminError ? error.status : 500,
    );
  }
}
