import type { Check, Finding, ScanContext } from "../types";

const KEY = "security-headers";
const TITLE = "HTTP security headers";

// Recommended HSTS floor: 180 days. Anything shorter leaves a downgrade window.
const HSTS_MIN = 15552000;

// A best-practice recommendation, not an exploitable flaw, shown separately and
// never counted toward the grade.
function harden(title: string, detail: string, fix: string, evidence?: string): Finding {
  return { checkKey: KEY, title, severity: "low", category: "hardening", passed: false, detail, fix, evidence };
}

export const securityHeaders: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const h = ctx.headers;
    const isHttps = ctx.origin.startsWith("https://");
    const csp = h["content-security-policy"] || "";
    const cspReportOnly = h["content-security-policy-report-only"] || "";
    const anyCsp = csp || cspReportOnly;
    const findings: Finding[] = [];

    // A wildcard CORS origin combined with credentials is actively dangerous,
    // this one is a real vulnerability and DOES count toward the grade.
    if (
      h["access-control-allow-origin"] === "*" &&
      (h["access-control-allow-credentials"] || "").toLowerCase() === "true"
    ) {
      findings.push({
        checkKey: KEY,
        title: "Unsafe CORS configuration",
        severity: "high",
        category: "vulnerability",
        passed: false,
        detail:
          "The server sends `Access-Control-Allow-Origin: *` together with credentials, letting any website make authenticated requests to your API.",
        fix: "Never combine `*` with credentials. Echo back a specific allow-listed origin when credentials are required.",
      });
    }

    // Content-Security-Policy, presence (enforcing OR report-only), then quality.
    if (!anyCsp) {
      findings.push(
        harden(
          "Add a Content-Security-Policy",
          "No CSP header is set. A CSP limits where scripts and other resources may load from, and it's a strong defense-in-depth layer against cross-site scripting.",
          "Add a Content-Security-Policy header. Start from `default-src 'self'` and tighten it to your app's real sources.",
        ),
      );
    } else {
      if (!csp && cspReportOnly) {
        findings.push(
          harden(
            "Enforce your Content-Security-Policy",
            "A CSP is present but only in report-only mode, so violations are logged rather than blocked. It isn't actually protecting users yet.",
            "Once your report-only policy is clean, move it from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` to enforce it.",
          ),
        );
      }
      // "Weak" only when unsafe-inline/eval or a wildcard source appears WITHOUT a
      // nonce or strict-dynamic (which neutralize them in modern browsers).
      const policy = csp || cspReportOnly;
      const hasUnsafe = /unsafe-inline|unsafe-eval/i.test(policy);
      const neutralized = /nonce-|strict-dynamic/i.test(policy);
      const hasWildcardSource = /(?:default|script)-src[^;]*\s\*(?:\s|;|$)/i.test(policy);
      if ((hasUnsafe && !neutralized) || hasWildcardSource) {
        findings.push(
          harden(
            "Tighten your Content-Security-Policy",
            "The CSP allows `unsafe-inline`/`unsafe-eval` or a wildcard source without a nonce or `strict-dynamic`, which significantly weakens its XSS protection.",
            "Remove `unsafe-inline` / `unsafe-eval` and wildcard sources; use nonces or hashes for any inline scripts.",
          ),
        );
      }
    }

    // Strict-Transport-Security, only meaningful over HTTPS.
    if (isHttps) {
      const hsts = h["strict-transport-security"] || "";
      if (!hsts) {
        findings.push(
          harden(
            "Add Strict-Transport-Security (HSTS)",
            "No HSTS header, so a browser could still be steered to plain HTTP, exposing users to downgrade and man-in-the-middle attacks.",
            "Add `Strict-Transport-Security: max-age=63072000; includeSubDomains`.",
          ),
        );
      } else {
        const maxAge = Number(hsts.match(/max-age\s*=\s*(\d+)/i)?.[1] || "0");
        if (maxAge < HSTS_MIN) {
          findings.push(
            harden(
              "Strengthen your HSTS max-age",
              `HSTS is set but its max-age (${maxAge}s) is short, leaving a window where a downgrade attack still works.`,
              "Raise HSTS `max-age` to at least 15552000 (180 days), ideally 63072000, and add `includeSubDomains`.",
            ),
          );
        }
      }
    }

    // Clickjacking: X-Frame-Options OR a CSP frame-ancestors directive.
    if (!h["x-frame-options"] && !/frame-ancestors/i.test(anyCsp)) {
      findings.push(
        harden(
          "Add clickjacking protection",
          "Neither `X-Frame-Options` nor a CSP `frame-ancestors` directive is set, so your pages could be embedded in a hostile iframe (clickjacking).",
          "Add `X-Frame-Options: DENY`, or a CSP `frame-ancestors 'none'` directive.",
        ),
      );
    }

    if ((h["x-content-type-options"] || "").toLowerCase() !== "nosniff") {
      findings.push(
        harden(
          "Add an X-Content-Type-Options header",
          "`X-Content-Type-Options: nosniff` is not set, so browsers may MIME-sniff responses and run them as an unintended content type.",
          "Add `X-Content-Type-Options: nosniff`.",
        ),
      );
    }

    if (!h["referrer-policy"]) {
      findings.push(
        harden(
          "Add a Referrer-Policy header",
          "No `Referrer-Policy`, so full URLs (which can contain tokens or IDs) may leak to third-party sites via the Referer header.",
          "Add `Referrer-Policy: strict-origin-when-cross-origin` (or stricter).",
        ),
      );
    }

    if (!h["permissions-policy"]) {
      findings.push(
        harden(
          "Add a Permissions-Policy header",
          "No `Permissions-Policy`, so powerful browser features (camera, microphone, geolocation) are not restricted for your pages.",
          "Add a `Permissions-Policy` disabling features you don't use, e.g. `geolocation=(), camera=(), microphone=()`.",
        ),
      );
    }

    if (findings.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "Core security headers are present and reasonably configured.",
          fix: "",
        },
      ];
    }
    return findings;
  },
};
