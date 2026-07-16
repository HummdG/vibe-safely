import type { Check, Finding, ScanContext } from "../types";

const KEY = "source-maps";
const TITLE = "Exposed source maps";

// Probe a few of the app's own bundles for an adjacent .map file. Bounded so a
// large app doesn't cause a burst of requests.
const MAX_PROBES = 5;

export const sourceMaps: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const exposed: string[] = [];

    for (const bundle of ctx.bundles.slice(0, MAX_PROBES)) {
      const mapUrl = bundle.url.split("?")[0] + ".map";
      try {
        const res = await ctx.fetchImpl(mapUrl, { redirect: "manual" });
        if (res.status !== 200) continue;
        const body = (await res.text()).slice(0, 2048);
        // A real source map is JSON with these keys; guards against SPA 200-fallbacks.
        if (/"version"\s*:\s*3|"sources"\s*:\s*\[|"mappings"\s*:/.test(body)) {
          exposed.push(mapUrl.replace(ctx.origin, ""));
        }
      } catch {
        /* skip unreadable probe */
      }
      if (exposed.length >= 3) break;
    }

    if (exposed.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No JavaScript source maps were publicly reachable.",
          fix: "",
        },
      ];
    }

    return [
      {
        checkKey: KEY,
        title: "Source maps are publicly exposed",
        severity: "low",
        passed: false,
        detail: `${exposed.length} source map${exposed.length > 1 ? "s were" : " was"} reachable (e.g. \`${exposed[0]}\`). Source maps rebuild your original, unminified source (comments, variable names, internal logic) for anyone who asks.`,
        fix: "Stop serving `.map` files in production. In Next.js keep `productionBrowserSourceMaps: false` (the default) and ensure your host/CDN doesn't expose them.",
        evidence: exposed[0],
      },
    ];
  },
};
