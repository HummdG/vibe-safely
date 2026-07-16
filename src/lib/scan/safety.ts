// SSRF guard: this tool fetches user-supplied URLs server-side, so we must
// refuse internal/private targets (cloud metadata, localhost, RFC-1918).
// NOTE: this is hostname-level only. Production should also resolve DNS and
// re-check the resolved IP to defend against DNS-rebinding.

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "metadata"]);

function isPrivateIp(host: string): boolean {
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return true;
  if (host === "::1" || host.startsWith("fc00:") || host.startsWith("fe80:")) return true;
  const m = host.match(/^172\.(\d{1,3})\./);
  if (m) {
    const o = Number(m[1]);
    if (o >= 16 && o <= 31) return true;
  }
  return false;
}

export function assertPublicUrl(raw: string): URL {
  // If the input already carries a scheme, keep it (so we can reject non-http
  // schemes like ftp:/file:); only default to https when no scheme is present.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  let u: URL;
  try {
    u = new URL(hasScheme ? raw : "https://" + raw);
  } catch {
    throw new Error("Enter a valid URL (e.g. https://yourapp.com).");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs can be scanned.");
  }
  // Dev-only escape hatch for scanning a local test target (e.g. the vuln-demo).
  // Gated behind an explicit env var, NEVER set VIBESAFELY_ALLOW_LOCAL in production,
  // as it disables the SSRF protections below (localhost / private / metadata).
  if (process.env.VIBESAFELY_ALLOW_LOCAL === "1") {
    return u;
  }
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("That host can't be scanned.");
  }
  if (isPrivateIp(host)) {
    throw new Error("Private or internal addresses can't be scanned.");
  }
  return u;
}
