/**
 * Enterprise Managed User logins carry the enterprise short code as a
 * trailing `_suffix` (e.g. `octocat_acme` → `acme`).
 */
export function extractEnterpriseNameFromLogin(login: string | undefined): string | null {
  if (!login) return null;
  const separatorIndex = login.lastIndexOf('_');
  if (separatorIndex <= 0) return null;
  const suffix = login.slice(separatorIndex + 1).trim();
  return suffix.length > 0 ? suffix : null;
}

export function deriveEnterpriseName(logins: Iterable<string | undefined>): string | null {
  for (const login of logins) {
    const name = extractEnterpriseNameFromLogin(login);
    if (name) return name;
  }
  return null;
}
