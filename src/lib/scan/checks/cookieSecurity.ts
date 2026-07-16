import type { Check, Finding, ScanContext } from "../types";

const KEY = "cookie-security";
const TITLE = "Cookie security";

// Cookie names that suggest a session/auth token, for these, a missing
// HttpOnly/Secure flag is a real session-theft risk, not just a best-practice nit.
const SENSITIVE = /sess|sid|auth|token|jwt|login/i;

interface ParsedCookie {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: boolean;
}

function parseCookie(raw: string): ParsedCookie {
  const parts = raw.split(";");
  const name = (parts[0]?.split("=")[0] || "").trim();
  const flags = parts.slice(1).map((a) => a.trim().toLowerCase());
  return {
    name,
    httpOnly: flags.includes("httponly"),
    secure: flags.includes("secure"),
    sameSite: flags.some((f) => f.startsWith("samesite=")),
  };
}

export const cookieSecurity: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    if (ctx.cookies.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No cookies were set by the site.",
          fix: "",
        },
      ];
    }

    const isHttps = ctx.origin.startsWith("https://");
    const findings: Finding[] = [];

    for (const raw of ctx.cookies) {
      const c = parseCookie(raw);
      if (!c.name) continue;
      const sensitive = SENSITIVE.test(c.name);

      if (!c.httpOnly) {
        findings.push({
          checkKey: KEY,
          title: sensitive
            ? `Session cookie "${c.name}" is readable by JavaScript`
            : `Cookie "${c.name}" is missing HttpOnly`,
          severity: sensitive ? "medium" : "low",
          category: sensitive ? "vulnerability" : "hardening",
          passed: false,
          detail: sensitive
            ? `The \`${c.name}\` cookie has no \`HttpOnly\` flag, so any XSS on your site can read it and hijack the session.`
            : `The \`${c.name}\` cookie has no \`HttpOnly\` flag, so page JavaScript can read it.`,
          fix: "Set `HttpOnly` on session/auth cookies so JavaScript (and injected XSS) can't read them.",
          evidence: c.name,
        });
      }
      if (isHttps && !c.secure) {
        findings.push({
          checkKey: KEY,
          title: sensitive
            ? `Session cookie "${c.name}" can be sent over plain HTTP`
            : `Cookie "${c.name}" is missing Secure`,
          severity: sensitive ? "medium" : "low",
          category: sensitive ? "vulnerability" : "hardening",
          passed: false,
          detail: `The \`${c.name}\` cookie has no \`Secure\` flag, so it can be transmitted over an unencrypted connection and intercepted.`,
          fix: "Add the `Secure` flag so the cookie is only ever sent over HTTPS.",
          evidence: c.name,
        });
      }
      if (!c.sameSite) {
        findings.push({
          checkKey: KEY,
          title: `Cookie "${c.name}" is missing SameSite`,
          severity: "low",
          category: "hardening",
          passed: false,
          detail: `The \`${c.name}\` cookie has no \`SameSite\` attribute, which weakens cross-site-request-forgery protection.`,
          fix: "Add `SameSite=Lax` (or `Strict`) to limit when the cookie is sent cross-site.",
          evidence: c.name,
        });
      }
    }

    if (findings.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "Cookies set the recommended security flags.",
          fix: "",
        },
      ];
    }
    return findings;
  },
};
