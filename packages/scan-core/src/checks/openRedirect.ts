import type { Check, Finding, ScanContext } from "../types";

const KEY = "open-redirect";
const TITLE = "Open redirect";
const EVIL = "https://vibesafely-redirect-probe.example/x";
const PARAM_NAMES = [
  "next",
  "redirect",
  "redirect_uri",
  "redirect_url",
  "url",
  "return",
  "returnto",
  "return_to",
  "dest",
  "destination",
  "goto",
  "continue",
  "callback",
];

function discoverRedirectParams(text: string): string[] {
  const set = new Set<string>();
  for (const name of PARAM_NAMES) {
    if (new RegExp(`[?&]${name}=`, "i").test(text)) set.add(name);
  }
  return [...set].slice(0, 5);
}

// Active + ownership-gated: only tests redirect params the app actually uses.
export const openRedirect: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: true,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const params = discoverRedirectParams(text);
    if (params.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          applicable: false,
          detail: "No redirect parameters were found in the app to test.",
          fix: "",
        },
      ];
    }

    for (const p of params) {
      try {
        const url = `${ctx.origin}/?${p}=${encodeURIComponent(EVIL)}`;
        const res = await ctx.fetchImpl(url, { redirect: "manual" });
        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location") || "";
          if (/vibesafely-redirect-probe\.example/.test(loc)) {
            return [
              {
                checkKey: KEY,
                title: `Open redirect via ?${p}=`,
                severity: "medium",
                category: "vulnerability",
                passed: false,
                detail: `The app redirected to an external URL supplied in the \`${p}\` parameter. Attackers use this to send phishing links that carry your domain, and to slip past some auth/callback checks.`,
                fix: "Only redirect to a relative path or an allow-listed host; ignore or reject absolute off-site URLs in redirect params.",
                evidence: `?${p}=`,
              },
            ];
          }
        }
      } catch {
        /* skip */
      }
    }

    return [
      {
        checkKey: KEY,
        title: "No open redirect found",
        severity: "pass",
        passed: true,
        detail: "Redirect parameters didn't send us to an external domain.",
        fix: "",
      },
    ];
  },
};
