import type { Check, Finding, ScanContext } from "../types";

const KEY = "robots-sitemap";
const TITLE = "Robots / sitemap disclosure";

// Disallow entries pointing at these are recon gifts, attackers read robots.txt first.
const SENSITIVE =
  /admin|dashboard|internal|private|secret|backup|config|staging|debug|wp-admin|\/api\/|\.git|\.env|account|login|\/dev\b|\/test\b/i;

export const robotsSitemap: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    let disallowed: string[] = [];
    try {
      const res = await ctx.fetchImpl(ctx.origin + "/robots.txt", { redirect: "manual" });
      if (res.status === 200) {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        const body = (await res.text()).slice(0, 8192);
        if (!ct.includes("html") && !/<!doctype|<html/i.test(body)) {
          for (const line of body.split(/\r?\n/)) {
            const m = line.match(/^\s*Disallow:\s*(\S+)/i);
            if (m && m[1] !== "/" && SENSITIVE.test(m[1])) disallowed.push(m[1]);
          }
        }
      }
    } catch {
      /* skip */
    }

    disallowed = [...new Set(disallowed)].slice(0, 8);

    if (disallowed.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No sensitive paths were disclosed in robots.txt.",
          fix: "",
        },
      ];
    }
    return [
      {
        checkKey: KEY,
        title: "Sensitive paths disclosed in robots.txt",
        severity: "low",
        category: "hardening",
        passed: false,
        detail: `robots.txt advertises paths worth a second look: ${disallowed.join(", ")}. A Disallow entry points attackers straight at admin/internal routes.`,
        fix: "Don't rely on robots.txt to hide routes. Remove sensitive paths from it and protect them with real authentication.",
        evidence: disallowed.slice(0, 3).join(", "),
      },
    ];
  },
};
