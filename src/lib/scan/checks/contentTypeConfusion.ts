import type { Check, Finding, ScanContext } from "../types";

const KEY = "content-type-confusion";
const TITLE = "API content-type handling";
const CANARY = "VSAFEXXE7Q2X";
const MAX_ENDPOINTS = 3;

function discoverApiEndpoints(text: string, origin: string): string[] {
  const re = /["'`](\/api\/[a-z0-9/_-]{1,60})["'`]/gi;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    set.add(origin + m[1]);
    if (set.size >= 8) break;
  }
  return [...set].slice(0, MAX_ENDPOINTS);
}

// Active + ownership-gated: sends crafted bodies to the app's own API. Non-destructive
// (a benign XXE canary with an internal entity, no external fetch, no DoS payloads).
export const contentTypeConfusion: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: true,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const endpoints = discoverApiEndpoints(text, ctx.origin);
    if (endpoints.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          applicable: false,
          detail: "No API endpoint was found in the app to test for content-type handling.",
          fix: "",
        },
      ];
    }

    const xmlXxe = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x "${CANARY}">]><r>&x;</r>`;

    for (const ep of endpoints) {
      try {
        const res = await ctx.fetchImpl(ep, {
          method: "POST",
          headers: { "content-type": "application/xml" },
          body: xmlXxe,
        });
        if (res.status !== 415) {
          const out = (await res.text()).slice(0, 4000);
          // The canary must appear WITHOUT our entity declaration, otherwise it's
          // just an endpoint echoing the raw body, not a parser that resolved the entity.
          if (out.includes(CANARY) && !/<!ENTITY\s+x\b/i.test(out)) {
            const path = ep.replace(ctx.origin, "");
            return [
              {
                checkKey: KEY,
                title: `XML external entities processed at ${path}`,
                severity: "high",
                category: "vulnerability",
                passed: false,
                detail:
                  "The endpoint parsed an XML body and resolved a DOCTYPE entity. Our canary came back. That's XXE: a crafted entity could read local files, reach internal services, or exfiltrate data.",
                fix: "If the API is JSON-only, reject other content types with 415. If it must accept XML, disable DTDs and external entities in the parser.",
              },
            ];
          }
        }
      } catch {
        /* skip */
      }
    }

    for (const ep of endpoints) {
      try {
        const res = await ctx.fetchImpl(ep, {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: '{"probe":1}',
        });
        if (res.status >= 200 && res.status < 300) {
          const path = ep.replace(ctx.origin, "");
          return [
            {
              checkKey: KEY,
              title: `${path} accepts unexpected content types`,
              severity: "medium",
              category: "vulnerability",
              passed: false,
              detail:
                "The endpoint processed a `text/plain` body instead of rejecting it. `text/plain` is a CORS 'simple request' that skips the preflight, so this opens a CSRF path and can bypass validation written for the JSON parser.",
              fix: "Require and verify `Content-Type: application/json` on JSON APIs; reject anything else with 415.",
            },
          ];
        }
      } catch {
        /* skip */
      }
    }

    return [
      {
        checkKey: KEY,
        title: "API enforces content types",
        severity: "pass",
        passed: true,
        detail: "The tested endpoints rejected XML and text/plain bodies.",
        fix: "",
      },
    ];
  },
};
