import type { Check, Finding, ScanContext } from "../types";

const KEY = "http-methods";
const TITLE = "HTTP methods";

export const httpMethods: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    let allow = "";
    try {
      const res = await ctx.fetchImpl(ctx.origin + "/", { method: "OPTIONS", redirect: "manual" });
      allow = (
        res.headers.get("allow") ||
        res.headers.get("access-control-allow-methods") ||
        ""
      ).toUpperCase();
    } catch {
      /* skip */
    }

    const risky = ["PUT", "DELETE", "PATCH", "TRACE"].filter((m) => allow.includes(m));
    if (risky.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No write or trace HTTP methods were advertised.",
          fix: "",
        },
      ];
    }
    return [
      {
        checkKey: KEY,
        title: `Write HTTP methods advertised (${risky.join(", ")})`,
        severity: "low",
        category: "hardening",
        passed: false,
        detail: `The server advertises ${risky.join(", ")} via its Allow header. If any are reachable without auth they could modify or delete data; TRACE can also enable cross-site tracing.`,
        fix: "Disable HTTP methods your app doesn't use at the server/proxy, and require auth on the ones you do.",
        evidence: allow,
      },
    ];
  },
};
