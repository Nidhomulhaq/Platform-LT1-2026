const LOGIN_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const LOGIN_EMAIL_DOMAIN = "accounts.lt1.invalid";

export function normalizeLoginId(value: string) {
  return value.trim().toLowerCase();
}

export function loginIdToAuthEmail(loginId: string) {
  const normalized = normalizeLoginId(loginId);
  if (!LOGIN_ID_PATTERN.test(normalized)) {
    throw new Error("ID pengguna hanya boleh berisi huruf, angka, titik, dan tanda hubung.");
  }
  return `${normalized}@${LOGIN_EMAIL_DOMAIN}`;
}
