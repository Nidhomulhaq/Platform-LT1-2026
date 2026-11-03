class SupabaseAdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  for (const key of ["message", "msg", "error_description", "error"]) {
    if (typeof payload[key] === "string") return payload[key];
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAdminKeys() {
  const apiKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorizationToken =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;
  if (!apiKey || !authorizationToken) {
    throw new Error(
      "Kunci admin Supabase belum tersedia pada environment server.",
    );
  }
  return { apiKey, authorizationToken };
}

export async function adminRequest(
  projectUrl: string,
  pathname: string,
  method: string,
  body?: unknown,
  prefer?: string,
): Promise<unknown> {
  const { apiKey, authorizationToken } = getAdminKeys();
  const response = await fetch(`${projectUrl.replace(/\/+$/, "")}${pathname}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${authorizationToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw new SupabaseAdminError(
      getErrorMessage(payload, "Permintaan admin Supabase gagal."),
      response.status,
    );
  }
  return payload;
}

export { SupabaseAdminError };
