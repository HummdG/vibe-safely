// Fetches the target's public surface once (HTML + referenced JS bundles),
// then hands a single ScanContext to every check so we don't refetch per check.

import type { ScanContext, FetchLike, Bundle } from "./types";
import { detectSupabase, detectFirebase } from "./detect";

const MAX_BUNDLES = 10;
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const PER_BUNDLE_CAP = 2 * 1024 * 1024;
// Use a mainstream browser UA. Many sites (e.g. Google) serve a degraded header
// set, dropping HSTS / Permissions-Policy, to unrecognized bot UAs, which would
// make us report false "missing header" findings. We must evaluate the response a
// real visitor receives.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export function normalizeUrl(input: string): string {
  const u = input.trim();
  return /^https?:\/\//i.test(u) ? u : "https://" + u;
}

export function extractScriptUrls(html: string, origin: string): string[] {
  const urls = new Set<string>();
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], origin).toString();
      if (/\.js(\?|$)/i.test(abs) || abs.includes("/_next/") || abs.includes("/assets/")) {
        urls.add(abs);
      }
    } catch {
      /* ignore malformed src */
    }
  }
  return [...urls];
}

export async function gatherContext(
  input: string,
  ownerConfirmed: boolean,
  fetchImpl: FetchLike = fetch,
): Promise<ScanContext> {
  const url = normalizeUrl(input);

  // A URL that won't even parse is not scannable, report it instead of throwing
  // downstream (gatherContext is exported and called directly, e.g. from tests).
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      url,
      origin: "",
      domain: "",
      ownerConfirmed,
      status: 0,
      reachable: false,
      fetchError: "That doesn't look like a valid URL.",
      headers: {},
      cookies: [],
      html: "",
      bundles: [],
      fetchImpl,
    };
  }
  const origin = parsed.origin;
  const domain = parsed.host;

  let status = 0;
  let html = "";
  let reachable = false;
  let fetchError: string | undefined;
  const headers: Record<string, string> = {};
  let cookies: string[] = [];
  try {
    const res = await fetchImpl(url, { redirect: "follow", headers: { "user-agent": UA } });
    status = res.status;
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    // getSetCookie() preserves each Set-Cookie separately (the flat record can't).
    cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    html = await res.text();
    reachable = status >= 200 && status < 300;
    if (!reachable) fetchError = `The site returned HTTP ${status}.`;
  } catch {
    // DNS failure, connection refused, TLS error, etc., the target isn't a
    // reachable website, so we must NOT proceed to grade an empty context.
    fetchError = "Could not connect to the site.";
  }

  // Only pull JS bundles when the homepage was actually reachable.
  const bundles: Bundle[] = [];
  if (reachable) {
    const bundleUrls = extractScriptUrls(html, origin).slice(0, MAX_BUNDLES);
    let total = 0;
    for (const burl of bundleUrls) {
      if (total >= MAX_TOTAL_BYTES) break;
      try {
        const r = await fetchImpl(burl, { headers: { "user-agent": UA } });
        if (!r.ok) continue;
        const text = (await r.text()).slice(0, PER_BUNDLE_CAP);
        total += text.length;
        bundles.push({ url: burl, content: text });
      } catch {
        /* skip unreadable bundle */
      }
    }
  }

  const haystack = html + "\n" + bundles.map((b) => b.content).join("\n");
  const supabase = detectSupabase(haystack);
  const firebase = detectFirebase(haystack);

  return {
    url,
    origin,
    domain,
    ownerConfirmed,
    status,
    reachable,
    fetchError,
    headers,
    cookies,
    html,
    bundles,
    supabase,
    firebase,
    fetchImpl,
  };
}
