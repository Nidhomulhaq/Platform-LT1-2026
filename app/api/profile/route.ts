import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginIdToAuthEmail, normalizeLoginId } from "@/lib/auth/login-id";
import { adminRequest, SupabaseAdminError } from "@/lib/supabase/admin-server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type ProfileChanges = {
  full_name: string;
  login_id: string;
  phone_number: string | null;
  place_of_birth: string;
  date_of_birth: string | null;
  motto: string;
  school_id?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= today
  );
}

function parseProfileChanges(value: unknown): ProfileChanges | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.fullName !== "string" ||
    typeof value.loginId !== "string" ||
    typeof value.phoneNumber !== "string" ||
    typeof value.placeOfBirth !== "string" ||
    typeof value.dateOfBirth !== "string" ||
    typeof value.motto !== "string" ||
    (value.schoolId !== undefined && !isUuid(value.schoolId))
  ) {
    return null;
  }

  const fullName = value.fullName.trim();
  const loginId = normalizeLoginId(value.loginId);
  const phoneNumber = value.phoneNumber.trim();
  const placeOfBirth = value.placeOfBirth.trim();
  const dateOfBirth = value.dateOfBirth.trim();
  const motto = value.motto.trim();
  if (!fullName || fullName.length > 150) return null;
  if (!loginId || loginId.length > 64) return null;
  if (phoneNumber && !/^\+?[0-9\s().-]{7,20}$/.test(phoneNumber)) return null;
  if (placeOfBirth.length > 120 || motto.length > 240) return null;
  if (dateOfBirth && !validDate(dateOfBirth)) return null;

  try {
    loginIdToAuthEmail(loginId);
  } catch {
    return null;
  }

  return {
    full_name: fullName,
    login_id: loginId,
    phone_number: phoneNumber || null,
    place_of_birth: placeOfBirth,
    date_of_birth: dateOfBirth || null,
    motto,
    ...(typeof value.schoolId === "string"
      ? { school_id: value.schoolId }
      : {}),
  };
}

export async function GET() {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !publishableKey) {
    return jsonResponse({ error: "Konfigurasi Supabase belum tersedia." }, 503);
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
    return jsonResponse({ error: "Sesi login tidak valid." }, 401);
  }

  const profileQuery = new URLSearchParams({
    select:
      "full_name,login_id,phone_number,place_of_birth,date_of_birth,motto,role,school_id,is_active",
    id: `eq.${user.id}`,
  });
  try {
    const profiles = await adminRequest(
      projectUrl,
      `/rest/v1/profiles?${profileQuery}`,
      "GET",
    );
    if (!Array.isArray(profiles) || !isRecord(profiles[0])) {
      return jsonResponse({ error: "Profil akun tidak ditemukan." }, 404);
    }
    const profile = profiles[0];
    if (
      typeof profile.full_name !== "string" ||
      (typeof profile.login_id !== "string" && profile.login_id !== null) ||
      (typeof profile.phone_number !== "string" &&
        profile.phone_number !== null) ||
      typeof profile.place_of_birth !== "string" ||
      (typeof profile.date_of_birth !== "string" &&
        profile.date_of_birth !== null) ||
      typeof profile.motto !== "string" ||
      (typeof profile.school_id !== "string" && profile.school_id !== null) ||
      typeof profile.is_active !== "boolean" ||
      (profile.role !== "operator" &&
        profile.role !== "panitia" &&
        profile.role !== "juri" &&
        profile.role !== "peserta" &&
        profile.role !== "pendamping_regu")
    ) {
      return jsonResponse({ error: "Data profil akun tidak valid." }, 500);
    }
    return jsonResponse({ profile });
  } catch (error) {
    console.error(
      "Gagal memuat profil akun.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse({ error: "Profil akun gagal dimuat." }, 500);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return jsonResponse({ error: "Permintaan lintas situs ditolak." }, 403);
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !publishableKey) {
    return jsonResponse({ error: "Konfigurasi Supabase belum tersedia." }, 503);
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
    return jsonResponse({ error: "Sesi login tidak valid." }, 401);
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return jsonResponse({ error: "Format permintaan tidak valid." }, 400);
  }
  const changes = parseProfileChanges(requestBody);
  if (!changes) {
    return jsonResponse(
      {
        error:
          "Periksa kembali nama, ID pengguna, nomor WhatsApp, T/TL, dan motto.",
      },
      400,
    );
  }

  const profileQuery = new URLSearchParams({
    select:
      "full_name,login_id,phone_number,place_of_birth,date_of_birth,motto,role,school_id,is_active",
    id: `eq.${user.id}`,
  });

  try {
    const profiles = await adminRequest(
      projectUrl,
      `/rest/v1/profiles?${profileQuery}`,
      "GET",
    );
    if (!Array.isArray(profiles) || !isRecord(profiles[0])) {
      return jsonResponse({ error: "Profil akun tidak ditemukan." }, 404);
    }

    const currentProfile = profiles[0];
    if (
      typeof currentProfile.full_name !== "string" ||
      (typeof currentProfile.login_id !== "string" &&
        currentProfile.login_id !== null) ||
      (typeof currentProfile.phone_number !== "string" &&
        currentProfile.phone_number !== null) ||
      typeof currentProfile.place_of_birth !== "string" ||
      (typeof currentProfile.date_of_birth !== "string" &&
        currentProfile.date_of_birth !== null) ||
      typeof currentProfile.motto !== "string" ||
      (typeof currentProfile.school_id !== "string" &&
        currentProfile.school_id !== null) ||
      typeof currentProfile.is_active !== "boolean" ||
      (currentProfile.role !== "operator" &&
        currentProfile.role !== "panitia" &&
        currentProfile.role !== "juri" &&
        currentProfile.role !== "peserta" &&
        currentProfile.role !== "pendamping_regu")
    ) {
      return jsonResponse({ error: "Data profil akun tidak valid." }, 500);
    }
    if (!currentProfile.is_active) {
      return jsonResponse({ error: "Akun ini sedang dinonaktifkan." }, 403);
    }

    if (currentProfile.role === "peserta") {
      if (!changes.school_id) {
        return jsonResponse(
          { error: "Pilih pangkalan untuk profil Anda." },
          400,
        );
      }
      const schoolQuery = new URLSearchParams({
        select: "id",
        id: `eq.${changes.school_id}`,
      });
      const schools = await adminRequest(
        projectUrl,
        `/rest/v1/schools?${schoolQuery}`,
        "GET",
      );
      if (!Array.isArray(schools) || schools.length !== 1) {
        return jsonResponse(
          { error: "Pangkalan yang dipilih tidak ditemukan." },
          400,
        );
      }
    } else if (changes.school_id !== undefined) {
      return jsonResponse(
        { error: "Hanya peserta yang dapat mengubah pangkalan pada profil." },
        403,
      );
    }

    const loginChanged = currentProfile.login_id !== changes.login_id;
    if (loginChanged) {
      const duplicateQuery = new URLSearchParams({
        select: "id",
        login_id: `eq.${changes.login_id}`,
        id: `neq.${user.id}`,
      });
      const duplicates = await adminRequest(
        projectUrl,
        `/rest/v1/profiles?${duplicateQuery}`,
        "GET",
      );
      if (!Array.isArray(duplicates)) {
        throw new Error("Pemeriksaan ID pengguna gagal.");
      }
      if (duplicates.length > 0) {
        return jsonResponse({ error: "ID pengguna sudah digunakan." }, 409);
      }
    }

    const updateQuery = new URLSearchParams({ id: `eq.${user.id}` });
    const updatedProfiles = await adminRequest(
      projectUrl,
      `/rest/v1/profiles?${updateQuery}`,
      "PATCH",
      changes,
      "return=representation",
    );
    if (!Array.isArray(updatedProfiles) || updatedProfiles.length !== 1) {
      throw new Error("Data profil gagal disimpan.");
    }

    if (loginChanged) {
      try {
        await adminRequest(
          projectUrl,
          `/auth/v1/admin/users/${encodeURIComponent(user.id)}`,
          "PUT",
          {
            email: loginIdToAuthEmail(changes.login_id),
            email_confirm: true,
          },
        );
      } catch (error) {
        const previousProfile = {
          full_name: currentProfile.full_name,
          login_id: currentProfile.login_id,
          phone_number: currentProfile.phone_number,
          place_of_birth: currentProfile.place_of_birth,
          date_of_birth: currentProfile.date_of_birth,
          motto: currentProfile.motto,
          school_id: currentProfile.school_id,
        };
        try {
          await adminRequest(
            projectUrl,
            `/rest/v1/profiles?${updateQuery}`,
            "PATCH",
            previousProfile,
            "return=minimal",
          );
        } catch (rollbackError) {
          console.error(
            "Gagal memulihkan profil setelah perubahan ID login gagal.",
            rollbackError,
          );
          return jsonResponse(
            {
              error:
                "ID login gagal diperbarui dan pemulihan profil perlu diperiksa operator.",
            },
            500,
          );
        }
        throw error;
      }
    }

    return jsonResponse({ profile: changes });
  } catch (error) {
    if (error instanceof SupabaseAdminError && error.status === 409) {
      return jsonResponse({ error: "ID pengguna sudah digunakan." }, 409);
    }
    console.error(
      "Gagal memperbarui profil akun.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse(
      {
        error:
          error instanceof SupabaseAdminError
            ? "Perubahan profil gagal disimpan."
            : "Data profil gagal disimpan. Coba lagi.",
      },
      error instanceof SupabaseAdminError ? error.status : 500,
    );
  }
}
