import type { Check, Finding, ScanContext } from "../types";

const KEY = "cors-config";
const TITLE = "CORS policy";
const PROBE = "https://vibesafely-cors-probe.example";

export const corsConfig: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    let acao = "";
    let acac = "";
    try {
      const res = await ctx.fetchImpl(ctx.origin + "/", {
        headers: { origin: PROBE },
        redirect: "manual",
      });
      acao = res.headers.get("access-control-allow-origin") || "";
      acac = (res.headers.get("access-control-allow-credentials") || "").toLowerCase();
    } catch {
      /* skip */
    }

    const reflected = acao === PROBE;
    const nullOrigin = acao.toLowerCase() === "null";
    const withCreds = acac === "true";

    if (reflected && withCreds) {
      return [
        {
          checkKey: KEY,
          title: "CORS reflects any origin with credentials",
          severity: "high",
          category: "vulnerability",
          passed: false,
          detail:
            "The server echoes back whatever Origin it's sent AND allows credentials. Any website can make authenticated requests to your API on your users' behalf. It's a path to account takeover.",
          fix: "Never reflect arbitrary origins with credentials. Match Origin against a strict allow-list, and only then echo it back.",
          evidence: `Access-Control-Allow-Origin: ${acao}`,
        },
      ];
    }
    if (reflected || nullOrigin) {
      return [
        {
          checkKey: KEY,
          title: nullOrigin ? 'CORS allows the "null" origin' : "CORS reflects arbitrary origins",
          severity: "medium",
          category: "vulnerability",
          passed: false,
          detail: nullOrigin
            ? "The server allows the `null` origin, which sandboxed iframes and some attacker contexts can send, letting them read your API responses."
            : "The server echoes back any Origin it's sent, so any site can read your API responses (without credentials, but still a leak).",
          fix: "Replace origin reflection with a strict allow-list of the domains you actually trust.",
          evidence: `Access-Control-Allow-Origin: ${acao}`,
        },
      ];
    }

    return [
      {
        checkKey: KEY,
        title: TITLE,
        severity: "pass",
        passed: true,
        detail: "The server did not reflect an untrusted origin.",
        fix: "",
      },
    ];
  },
};
