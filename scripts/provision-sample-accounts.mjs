import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const accounts = [
  { loginId: "ahmad.nidhomulhaq", fullName: "Ahmad Nidhomul Haq", role: "operator" },
  { loginId: "mario.jajaja", fullName: "Mario Jajaja", role: "panitia" },
  { loginId: "julio.cesar", fullName: "Julio Cesar", role: "juri" },
  { loginId: "adellia.putri", fullName: "Adellia Putri", role: "peserta" },
];
const authEmailDomain = "accounts.lt1.invalid";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const credentialsPath = path.join(
  root,
  `sample-account-credentials-${new Date().toISOString().replaceAll(/[-:.]/g, "")}.csv`,
);
const projectUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const apiKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const authorizationToken =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!projectUrl || !apiKey || !authorizationToken) {
  throw new Error(
    "Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY (atau SUPABASE_SERVICE_ROLE_KEY) di .env.local.",
  );
}
if (existsSync(credentialsPath)) {
  throw new Error(`File kredensial sudah ada: ${credentialsPath}`);
}

const baseUrl = projectUrl.replace(/\/+$/, "");

async function request(api, method, pathname, body, prefer) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authorizationToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(api === "rest" && method !== "GET"
        ? { Prefer: prefer ?? "return=representation" }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload
        ? payload.message ?? payload.msg ?? payload.error_description
        : payload;
    throw new Error(`${method} ${pathname} gagal (${response.status}): ${message}`);
  }
  return payload;
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const result = await request(
      "auth",
      "GET",
      `/auth/v1/admin/users?page=${page}&perPage=100`,
    );
    const batch = result?.users;
    if (!Array.isArray(batch)) {
      throw new Error("Respons daftar pengguna Supabase tidak sesuai format.");
    }
    users.push(...batch);
    if (batch.length < 100) return users;
  }
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function findPompomTeam() {
  const params = new URLSearchParams({
    select: "id,name,category,school_id",
    name: "eq.Pompom",
  });
  const teams = await request("rest", "GET", `/rest/v1/teams?${params}`);
  const requestedSchoolId = process.env.POMPOM_SCHOOL_ID?.trim();
  const scopedTeams = requestedSchoolId
    ? teams.filter((team) => team.school_id === requestedSchoolId)
    : teams;
  const girlsTeams = scopedTeams.filter((team) => team.category === "putri");
  if (girlsTeams.length > 1) {
    throw new Error(
      "Ada beberapa Regu Pompom putri. Isi POMPOM_SCHOOL_ID dengan ID pangkalan Adellia.",
    );
  }
  const girlsTeam = girlsTeams[0];
  if (girlsTeam) return { team: girlsTeam, schoolId: girlsTeam.school_id };

  const existingSchoolIds = [...new Set(scopedTeams.map((team) => team.school_id))];
  if (!requestedSchoolId && existingSchoolIds.length > 1) {
    throw new Error(
      "Ada beberapa Regu Pompom di pangkalan berbeda. Isi POMPOM_SCHOOL_ID dengan ID pangkalan Adellia.",
    );
  }
  const schoolIdFromExistingTeam = existingSchoolIds[0];
  let schoolId =
    requestedSchoolId || schoolIdFromExistingTeam || "";
  if (!schoolId) {
    const schools = await request(
      "rest",
      "GET",
      "/rest/v1/schools?select=id,name&order=name",
    );
    if (schools.length === 1) schoolId = schools[0].id;
    else if (schools.length > 1) {
      const options = schools.map((school) => `${school.name} (${school.id})`);
      throw new Error(
        `Regu Pompom belum ada dan ada beberapa pangkalan. Isi POMPOM_SCHOOL_ID dengan ID pangkalan Adellia: ${options.join("; ")}`,
      );
    }
  }

  return { team: null, schoolId };
}

async function main() {
  const { team: existingTeam, schoolId } = await findPompomTeam();
  const authUsers = await listAuthUsers();
  const usersByEmail = new Map(authUsers.map((user) => [user.email, user]));
  const loginIds = accounts.map(({ loginId }) => loginId);
  const loginParams = new URLSearchParams({
    select: "id,login_id",
    login_id: `in.(${loginIds.join(",")})`,
  });
  const existingProfiles = await request(
    "rest",
    "GET",
    `/rest/v1/profiles?${loginParams}`,
  );
  const profilesByLoginId = new Map(
    existingProfiles.map((profile) => [profile.login_id, profile]),
  );

  for (const account of accounts) {
    const email = `${account.loginId}@${authEmailDomain}`;
    const existingUser = usersByEmail.get(email);
    const loginProfile = profilesByLoginId.get(account.loginId);
    if (loginProfile && loginProfile.id !== existingUser?.id) {
      throw new Error(
        `ID pengguna ${account.loginId} sudah dipakai akun lain; tidak ada perubahan yang dibuat.`,
      );
    }
  }

  let team = existingTeam;
  if (!team && schoolId) {
    const createdTeams = await request("rest", "POST", "/rest/v1/teams", {
      name: "Pompom",
      category: "putri",
      school_id: schoolId,
    });
    team = createdTeams[0];
    if (!team?.id) throw new Error("Regu Pompom gagal dibuat di Supabase.");
  }

  const generatedCredentials = [];
  let credentialFileCreated = false;
  const credentialFile = (rows) => [
    "Nama,ID Pengguna,Kata Sandi Sementara",
    ...rows.map((row) =>
      [row.fullName, row.loginId, row.password].map(csvCell).join(","),
    ),
    "",
  ].join("\r\n");
  const persistCredentials = () => {
    if (generatedCredentials.length) {
      writeFileSync(credentialsPath, credentialFile(generatedCredentials), {
        encoding: "utf8",
        flag: credentialFileCreated ? "w" : "wx",
        mode: 0o600,
      });
      credentialFileCreated = true;
    }
  };

  for (const account of accounts) {
    const email = `${account.loginId}@${authEmailDomain}`;
    let user = usersByEmail.get(email);
    if (!user) {
      const password = randomBytes(24).toString("base64url");
      const created = await request("auth", "POST", "/auth/v1/admin/users", {
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });
      user = created?.user ?? created;
      if (!user?.id) {
        throw new Error(`Supabase tidak mengembalikan ID untuk ${account.loginId}.`);
      }
      usersByEmail.set(email, user);
      generatedCredentials.push({ ...account, password });
      persistCredentials();
    }

    const profileParams = new URLSearchParams({ id: `eq.${user.id}` });
    const updatedProfiles = await request(
      "rest",
      "PATCH",
      `/rest/v1/profiles?${profileParams}`,
      {
        full_name: account.fullName,
        login_id: account.loginId,
        role: account.role,
      },
    );
    if (!updatedProfiles?.length) {
      throw new Error(
        `Profil ${account.loginId} tidak ditemukan. Pastikan migration Supabase sudah diterapkan.`,
      );
    }

    if (account.loginId === "adellia.putri" && team) {
      const membershipParams = new URLSearchParams({ on_conflict: "user_id" });
      await request(
        "rest",
        "POST",
        `/rest/v1/team_members?${membershipParams}`,
        { user_id: user.id, team_id: team.id, is_pinru: false },
        "resolution=merge-duplicates,return=representation",
      );
    }
  }

  const verificationParams = new URLSearchParams({
    select: "id,full_name,login_id,role",
    login_id: `in.(${loginIds.join(",")})`,
  });
  const verifiedProfiles = await request(
    "rest",
    "GET",
    `/rest/v1/profiles?${verificationParams}`,
  );
  if (
    verifiedProfiles.length !== accounts.length ||
    accounts.some((account) => {
      const profile = verifiedProfiles.find(
        ({ login_id }) => login_id === account.loginId,
      );
      return (
        profile?.id !==
          usersByEmail.get(`${account.loginId}@${authEmailDomain}`)?.id ||
        profile?.full_name !== account.fullName ||
        profile?.role !== account.role
      );
    })
  ) {
    throw new Error("Verifikasi gagal: data profil tidak sesuai.");
  }

  if (team) {
    const membershipParams = new URLSearchParams({
      select: "team_id",
      user_id: `eq.${usersByEmail.get(`adellia.putri@${authEmailDomain}`).id}`,
    });
    const memberships = await request(
      "rest",
      "GET",
      `/rest/v1/team_members?${membershipParams}`,
    );
    if (!memberships.some(({ team_id }) => team_id === team.id)) {
      throw new Error("Verifikasi gagal: Adellia belum masuk Regu Pompom.");
    }
  }

  console.log("Provisioning selesai dan profil/regu terverifikasi.");
  console.log(
    `Akun baru: ${generatedCredentials.length} dari ${accounts.length}.`,
  );
  if (generatedCredentials.length) {
    console.log(`Kredensial sementara tersimpan lokal di: ${credentialsPath}`);
    console.log("Bagikan secara privat, lalu minta pengguna mengganti kata sandi.");
  }
  if (team) {
    console.log(`Regu Pompom (putri): ${team.id}`);
  } else {
    console.log(
      "Regu Pompom belum dibuat: database belum memiliki pangkalan. Isi POMPOM_SCHOOL_ID setelah pangkalan yang benar tersedia, lalu jalankan ulang skrip untuk menyelesaikan pemetaan.",
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Provisioning gagal.");
  process.exitCode = 1;
});
