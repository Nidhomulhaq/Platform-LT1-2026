import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginIdToAuthEmail, normalizeLoginId } from "@/lib/auth/login-id";
import { adminRequest, SupabaseAdminError } from "@/lib/supabase/admin-server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type AccountRole = Database["public"]["Enums"]["user_role"];
type AccountRow = {
  id: string;
  full_name: string;
  login_id: string | null;
  role: AccountRole;
  school_id: string | null;
  is_active: boolean;
};
type MembershipRow = {
  user_id: string;
  team_id: string;
  is_pinru: boolean;
};
type CompanionTeamRow = {
  id: string;
  pendamping_id: string;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getOperator() {
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
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Gagal memeriksa hak akses manajemen akun.", profileError.message);
    return {
      error: jsonResponse(
        { error: "Hak akses akun gagal diverifikasi. Pastikan migration terbaru sudah diterapkan." },
        500,
      ),
    };
  }
  if (profile?.role !== "operator" || !profile.is_active) {
    return {
      error: jsonResponse(
        { error: "Hanya Operator aktif yang dapat mengelola akun." },
        403,
      ),
    };
  }
  return { userId: user.id, projectUrl, supabase };
}

function accountResponse(
  profile: AccountRow,
  membership?: MembershipRow,
  companionTeamId?: string,
) {
  return {
    id: profile.id,
    loginId: profile.login_id ?? "",
    fullName: profile.full_name,
    role: profile.role,
    schoolId: profile.school_id,
    teamId: membership?.team_id ?? companionTeamId ?? null,
    isPinru: membership?.is_pinru ?? false,
    isActive: profile.is_active,
  };
}

function getTeamAssignmentError(error: { code: string; message: string }) {
  if (error.code === "23505") {
    return new SupabaseAdminError(
      "Regu tersebut sudah ditugaskan kepada Pendamping Regu lain.",
      409,
    );
  }
  if (error.code === "23514") {
    return new SupabaseAdminError(
      "Akun Pendamping Regu harus aktif dan memiliki pangkalan.",
      409,
    );
  }
  if (error.code === "P0002") {
    return new SupabaseAdminError("Regu tidak ditemukan.", 404);
  }
  console.error("Gagal memperbarui penugasan regu Pendamping.", error.message);
  return new SupabaseAdminError(
    "Penugasan regu Pendamping gagal diperbarui.",
    500,
  );
}

async function getAccounts(projectUrl: string) {
  const profilesQuery = new URLSearchParams({
    select: "id,full_name,login_id,role,school_id,is_active",
    order: "full_name.asc",
  });
  const membershipsQuery = new URLSearchParams({
    select: "user_id,team_id,is_pinru",
  });
  const companionTeamsQuery = new URLSearchParams({
    select: "id,pendamping_id",
    pendamping_id: "not.is.null",
  });
  const [profiles, memberships, companionTeams] = await Promise.all([
    adminRequest(
      projectUrl,
      `/rest/v1/profiles?${profilesQuery}`,
      "GET",
    ),
    adminRequest(
      projectUrl,
      `/rest/v1/team_members?${membershipsQuery}`,
      "GET",
    ),
    adminRequest(
      projectUrl,
      `/rest/v1/teams?${companionTeamsQuery}`,
      "GET",
    ),
  ]);
  if (
    !Array.isArray(profiles) ||
    !Array.isArray(memberships) ||
    !Array.isArray(companionTeams)
  ) {
    throw new Error("Respons daftar akun dari Supabase tidak valid.");
  }
  const membershipsByUser = new Map(
    memberships
      .filter(
        (row): row is MembershipRow =>
          isRecord(row) &&
          typeof row.user_id === "string" &&
          typeof row.team_id === "string" &&
          typeof row.is_pinru === "boolean",
      )
      .map((row) => [row.user_id, row]),
  );
  const teamsByCompanion = new Map(
    companionTeams
      .filter(
        (row): row is CompanionTeamRow =>
          isRecord(row) &&
          typeof row.id === "string" &&
          typeof row.pendamping_id === "string",
      )
      .map((row) => [row.pendamping_id, row.id]),
  );
  return profiles.flatMap((row) => {
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      typeof row.full_name !== "string" ||
      (row.login_id !== null && typeof row.login_id !== "string") ||
      (row.school_id !== null && typeof row.school_id !== "string") ||
      (row.role !== "operator" &&
        row.role !== "panitia" &&
        row.role !== "juri" &&
        row.role !== "peserta" &&
        row.role !== "pendamping_regu") ||
      typeof row.is_active !== "boolean"
    ) {
      return [];
    }
    const profile: AccountRow = {
      id: row.id,
      full_name: row.full_name,
      login_id: row.login_id,
      role: row.role,
      school_id: row.school_id,
      is_active: row.is_active,
    };
    return [
      accountResponse(
        profile,
        membershipsByUser.get(profile.id),
        teamsByCompanion.get(profile.id),
      ),
    ];
  });
}

async function parseBody(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isAccountRole(value: unknown): value is AccountRole {
  return (
    value === "operator" ||
    value === "panitia" ||
    value === "juri" ||
    value === "peserta" ||
    value === "pendamping_regu"
  );
}

function ensureSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

async function ensureActiveOperatorRemains(
  projectUrl: string,
  targetUserId: string,
) {
  const query = new URLSearchParams({
    select: "id",
    role: "eq.operator",
    is_active: "eq.true",
  });
  const activeOperators = await adminRequest(
    projectUrl,
    `/rest/v1/profiles?${query}`,
    "GET",
  );
  if (
    !Array.isArray(activeOperators) ||
    !activeOperators.some(
      (operator) => isRecord(operator) && operator.id !== targetUserId,
    )
  ) {
    throw new SupabaseAdminError(
      "Setidaknya satu Operator aktif harus tetap tersedia.",
      409,
    );
  }
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
      "Akun yang gagal diprovisikan tidak dapat dibersihkan.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await getOperator();
  if ("error" in auth) return auth.error;
  try {
    return jsonResponse({ accounts: await getAccounts(auth.projectUrl) });
  } catch (error) {
    console.error(
      "Gagal memuat akun operator.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Daftar akun gagal dimuat.",
      },
      error instanceof SupabaseAdminError ? error.status : 500,
    );
  }
}

export async function POST(request: NextRequest) {
  if (!ensureSameOrigin(request)) {
    return jsonResponse({ error: "Permintaan lintas situs ditolak." }, 403);
  }
  const auth = await getOperator();
  if ("error" in auth) return auth.error;
  const body = await parseBody(request);
  if (body?.action === "export-passwords") {
    if (body.confirmation !== "reset-all-passwords") {
      return jsonResponse(
        { error: "Konfirmasi reset password seluruh akun tidak valid." },
        400,
      );
    }

    try {
      const accounts = await getAccounts(auth.projectUrl);
      const passwords: Record<string, string> = {};
      const failedUserIds: string[] = [];

      for (const account of accounts) {
        const password = randomBytes(24).toString("base64url");
        try {
          await adminRequest(
            auth.projectUrl,
            `/auth/v1/admin/users/${encodeURIComponent(account.id)}`,
            "PUT",
            { password },
          );
          passwords[account.id] = password;
        } catch (error) {
          console.error(
            `Gagal mereset password akun ${account.id} untuk ekspor.`,
            error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
          );
          failedUserIds.push(account.id);
        }
      }

      return NextResponse.json(
        {
          accounts: accounts.flatMap((account) =>
            passwords[account.id]
              ? [{ ...account, password: passwords[account.id] }]
              : [],
          ),
          failedUserIds,
        },
        {
          status: failedUserIds.length ? 207 : 200,
          headers: { "Cache-Control": "no-store" },
        },
      );
    } catch (error) {
      console.error(
        "Gagal memuat akun untuk ekspor password.",
        error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
      );
      return jsonResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Password akun gagal disiapkan untuk ekspor.",
        },
        error instanceof SupabaseAdminError ? error.status : 500,
      );
    }
  }

  if (
    !body ||
    body.action !== "create" ||
    typeof body.loginId !== "string" ||
    typeof body.fullName !== "string" ||
    !isAccountRole(body.role) ||
    (body.schoolId !== undefined &&
      body.schoolId !== null &&
      !isUuid(body.schoolId)) ||
    (body.teamId !== null && body.teamId !== undefined && !isUuid(body.teamId)) ||
    typeof body.isPinru !== "boolean"
  ) {
    return jsonResponse({ error: "Data akun tidak valid." }, 400);
  }

  const loginId = normalizeLoginId(body.loginId);
  const fullName = body.fullName.trim();
  if (!fullName || fullName.length > 150) {
    return jsonResponse({ error: "Nama lengkap harus berisi 1–150 karakter." }, 400);
  }
  if (loginId.length > 64) {
    return jsonResponse({ error: "ID pengguna maksimal 64 karakter." }, 400);
  }
  if (body.role !== "peserta" && body.teamId) {
    return jsonResponse(
      { error: "Hanya akun Peserta yang dapat dipetakan ke regu." },
      400,
    );
  }
  if (
    (body.role === "peserta" || body.role === "pendamping_regu") &&
    (typeof body.schoolId !== "string" || !isUuid(body.schoolId))
  ) {
    return jsonResponse(
      { error: "Pangkalan wajib dipilih untuk Peserta dan Pendamping Regu." },
      400,
    );
  }
  if (
    body.role !== "peserta" &&
    body.role !== "pendamping_regu" &&
    body.schoolId
  ) {
    return jsonResponse(
      { error: "Pangkalan hanya dapat ditetapkan pada Peserta atau Pendamping Regu." },
      400,
    );
  }
  if (body.isPinru && (!body.teamId || body.role !== "peserta")) {
    return jsonResponse(
      { error: "Pinru harus merupakan Peserta yang dipetakan ke regu." },
      400,
    );
  }

  let email: string;
  try {
    email = loginIdToAuthEmail(loginId);
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "ID pengguna tidak valid.",
      },
      400,
    );
  }

  let createdUserId = "";
  const temporaryPassword = randomBytes(24).toString("base64url");
  try {
    const createdUser = await adminRequest(
      auth.projectUrl,
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
      throw new Error("Supabase tidak mengembalikan ID akun yang dibuat.");
    }
    createdUserId = userRecord.id;

    const profileQuery = new URLSearchParams({ id: `eq.${createdUserId}` });
    const profileResult = await adminRequest(
      auth.projectUrl,
      `/rest/v1/profiles?${profileQuery}`,
      "PATCH",
      {
        full_name: fullName,
        login_id: loginId,
        role: body.role,
        school_id:
          body.role === "peserta" || body.role === "pendamping_regu"
            ? body.schoolId
            : null,
        is_active: true,
      },
      "return=representation",
    );
    if (!Array.isArray(profileResult) || profileResult.length !== 1) {
      throw new Error("Profil akun gagal dibuat atau tidak ditemukan.");
    }

    if (body.teamId) {
      await adminRequest(
        auth.projectUrl,
        "/rest/v1/team_members",
        "POST",
        {
          user_id: createdUserId,
          team_id: body.teamId,
          is_pinru: false,
        },
        "return=representation",
      );
    }

    const profile = profileResult[0];
    if (
      !isRecord(profile) ||
      (typeof profile.school_id !== "string" && profile.school_id !== null)
    ) {
      throw new Error("Data profil akun tidak valid.");
    }
    const account: AccountRow = {
      id: createdUserId,
      full_name: fullName,
      login_id: loginId,
      role: body.role,
      school_id: profile.school_id,
      is_active: true,
    };
    return jsonResponse(
      {
        account: accountResponse(
          account,
          body.teamId
            ? {
                user_id: createdUserId,
                team_id: body.teamId,
                is_pinru: false,
              }
            : undefined,
        ),
        temporaryPassword,
      },
      201,
    );
  } catch (error) {
    if (createdUserId) await deleteCreatedUser(auth.projectUrl, createdUserId);
    console.error(
      "Gagal membuat akun operator.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Akun gagal dibuat.",
      },
      error instanceof SupabaseAdminError ? error.status : 500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!ensureSameOrigin(request)) {
    return jsonResponse({ error: "Permintaan lintas situs ditolak." }, 403);
  }
  const auth = await getOperator();
  if ("error" in auth) return auth.error;
  const body = await parseBody(request);
  if (
    !body ||
    typeof body.action !== "string" ||
    !isUuid(body.userId)
  ) {
    return jsonResponse({ error: "Permintaan perubahan akun tidak valid." }, 400);
  }
  if (body.userId === auth.userId && body.action !== "reset-password") {
    return jsonResponse(
      { error: "Operator tidak dapat mengubah atau menonaktifkan akunnya sendiri." },
      409,
    );
  }

  try {
    if (body.action === "reset-password") {
      const temporaryPassword = randomBytes(24).toString("base64url");
      await adminRequest(
        auth.projectUrl,
        `/auth/v1/admin/users/${encodeURIComponent(body.userId)}`,
        "PUT",
        { password: temporaryPassword },
      );
      return jsonResponse({ temporaryPassword });
    }

    if (body.action === "toggle-active") {
      if (typeof body.isActive !== "boolean") {
        return jsonResponse({ error: "Status aktif akun tidak valid." }, 400);
      }
      const query = new URLSearchParams({
        id: `eq.${body.userId}`,
        select: "id,role",
      });
      const currentProfiles = await adminRequest(
        auth.projectUrl,
        `/rest/v1/profiles?${query}`,
        "GET",
      );
      if (!Array.isArray(currentProfiles) || !isRecord(currentProfiles[0])) {
        return jsonResponse({ error: "Akun tidak ditemukan." }, 404);
      }
      const currentRole = currentProfiles[0].role;
      if (currentRole === "operator" && !body.isActive) {
        await ensureActiveOperatorRemains(auth.projectUrl, body.userId);
      }

      const updateQuery = new URLSearchParams({ id: `eq.${body.userId}` });
      await adminRequest(
        auth.projectUrl,
        `/rest/v1/profiles?${updateQuery}`,
        "PATCH",
        { is_active: body.isActive },
        "return=representation",
      );
      await adminRequest(
        auth.projectUrl,
        `/auth/v1/admin/users/${encodeURIComponent(body.userId)}`,
        "PUT",
        { ban_duration: body.isActive ? "none" : "876000h" },
      );
      return jsonResponse({ isActive: body.isActive });
    }

    if (body.action === "update-role") {
      if (!isAccountRole(body.role)) {
        return jsonResponse({ error: "Peran akun tidak valid." }, 400);
      }
      const query = new URLSearchParams({
        id: `eq.${body.userId}`,
        select: "id,role,is_active,school_id",
      });
      const currentProfiles = await adminRequest(
        auth.projectUrl,
        `/rest/v1/profiles?${query}`,
        "GET",
      );
      if (!Array.isArray(currentProfiles) || !isRecord(currentProfiles[0])) {
        return jsonResponse({ error: "Akun tidak ditemukan." }, 404);
      }
      if (
        body.role === "pendamping_regu" &&
        !isUuid(currentProfiles[0].school_id)
      ) {
        return jsonResponse(
          { error: "Akun Pendamping Regu harus memiliki pangkalan. Buat akun baru dengan pangkalan yang benar." },
          409,
        );
      }
      if (
        currentProfiles[0].role === "pendamping_regu" &&
        body.role !== "pendamping_regu"
      ) {
        const { error } = await auth.supabase.rpc("set_team_pendamping", {
          target_user_id: body.userId,
          target_team_id: null,
        });
        if (error) throw getTeamAssignmentError(error);
      }
      if (
        currentProfiles[0].role === "operator" &&
        currentProfiles[0].is_active === true &&
        body.role !== "operator"
      ) {
        await ensureActiveOperatorRemains(auth.projectUrl, body.userId);
      }
      const updateQuery = new URLSearchParams({ id: `eq.${body.userId}` });
      await adminRequest(
        auth.projectUrl,
        `/rest/v1/profiles?${updateQuery}`,
        "PATCH",
        {
          role: body.role,
          ...(
            body.role === "peserta" || body.role === "pendamping_regu"
              ? {}
              : { school_id: null }
          ),
        },
        "return=representation",
      );
      if (body.role !== "peserta") {
        const membershipQuery = new URLSearchParams({
          user_id: `eq.${body.userId}`,
        });
        await adminRequest(
          auth.projectUrl,
          `/rest/v1/team_members?${membershipQuery}`,
          "DELETE",
        );
      }
      if (body.role !== "juri") {
        const assignmentQuery = new URLSearchParams({
          juri_id: `eq.${body.userId}`,
        });
        await adminRequest(
          auth.projectUrl,
          `/rest/v1/judge_assignments?${assignmentQuery}`,
          "DELETE",
        );
      }
      if (body.role !== "panitia") {
        const assignmentQuery = new URLSearchParams({
          panitia_id: `eq.${body.userId}`,
        });
        await adminRequest(
          auth.projectUrl,
          `/rest/v1/panitia_assignments?${assignmentQuery}`,
          "DELETE",
        );
      }
      return jsonResponse({ role: body.role });
    }

    if (body.action === "map-team") {
      if (
        body.teamId !== null &&
        body.teamId !== undefined &&
        !isUuid(body.teamId)
      ) {
        return jsonResponse({ error: "Regu tujuan tidak valid." }, 400);
      }
      const roleQuery = new URLSearchParams({
        id: `eq.${body.userId}`,
        select: "role",
      });
      const profiles = await adminRequest(
        auth.projectUrl,
        `/rest/v1/profiles?${roleQuery}`,
        "GET",
      );
      if (!Array.isArray(profiles) || !isRecord(profiles[0])) {
        return jsonResponse({ error: "Akun tidak ditemukan." }, 404);
      }
      if (profiles[0].role === "pendamping_regu") {
        const { error } = await auth.supabase.rpc("set_team_pendamping", {
          target_user_id: body.userId,
          target_team_id: body.teamId ?? null,
        });
        if (error) throw getTeamAssignmentError(error);
        return jsonResponse({
          teamId: body.teamId ?? null,
          isPinru: false,
        });
      }
      if (profiles[0].role !== "peserta") {
        return jsonResponse(
          { error: "Hanya akun Peserta yang dapat dipetakan ke regu." },
          400,
        );
      }
      const membershipQuery = new URLSearchParams({
        user_id: `eq.${body.userId}`,
      });
      if (!body.teamId) {
        await adminRequest(
          auth.projectUrl,
          `/rest/v1/team_members?${membershipQuery}`,
          "DELETE",
        );
        return jsonResponse({ teamId: null, isPinru: false });
      }
      const mapped = await adminRequest(
        auth.projectUrl,
        "/rest/v1/team_members?on_conflict=user_id",
        "POST",
        { user_id: body.userId, team_id: body.teamId, is_pinru: false },
        "resolution=merge-duplicates,return=representation",
      );
      if (!Array.isArray(mapped) || !isRecord(mapped[0])) {
        throw new Error("Pemetaan regu tidak menghasilkan keanggotaan.");
      }
      return jsonResponse({
        teamId: mapped[0].team_id,
        isPinru: mapped[0].is_pinru,
      });
    }

    return jsonResponse({ error: "Aksi pengelolaan akun tidak dikenal." }, 400);
  } catch (error) {
    console.error(
      "Gagal memperbarui akun operator.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Akun gagal diperbarui.",
      },
      error instanceof SupabaseAdminError ? error.status : 500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!ensureSameOrigin(request)) {
    return jsonResponse({ error: "Permintaan lintas situs ditolak." }, 403);
  }
  const auth = await getOperator();
  if ("error" in auth) return auth.error;
  const body = await parseBody(request);
  if (!body || !isUuid(body.userId)) {
    return jsonResponse({ error: "Akun yang akan dihapus tidak valid." }, 400);
  }
  if (body.userId === auth.userId) {
    return jsonResponse(
      { error: "Operator tidak dapat menghapus akunnya sendiri." },
      409,
    );
  }

  try {
    const profileQuery = new URLSearchParams({
      id: `eq.${body.userId}`,
      select: "id,role,is_active",
    });
    const profiles = await adminRequest(
      auth.projectUrl,
      `/rest/v1/profiles?${profileQuery}`,
      "GET",
    );
    if (!Array.isArray(profiles) || !isRecord(profiles[0])) {
      return jsonResponse({ error: "Akun tidak ditemukan." }, 404);
    }

    if (
      profiles[0].role === "operator" &&
      profiles[0].is_active === true
    ) {
      await ensureActiveOperatorRemains(auth.projectUrl, body.userId);
    }

    await adminRequest(
      auth.projectUrl,
      `/auth/v1/admin/users/${encodeURIComponent(body.userId)}`,
      "DELETE",
    );
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error(
      "Gagal menghapus akun operator.",
      error instanceof Error ? error.message : "Kesalahan tidak diketahui.",
    );
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Akun gagal dihapus.",
      },
      error instanceof SupabaseAdminError ? error.status : 500,
    );
  }
}
