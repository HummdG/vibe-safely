import type { Check, Finding, ScanContext } from "../types";

const KEY = "storage-buckets";
const TITLE = "Supabase storage exposure";

export const storageBuckets: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: true,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const sb = ctx.supabase;
    if (!sb || !sb.anonKey) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          applicable: false,
          detail: "No Supabase project was detected in this app, so there was no storage to test.",
          fix: "",
        },
      ];
    }

    try {
      const res = await ctx.fetchImpl(`${sb.url}/storage/v1/bucket`, {
        headers: { apikey: sb.anonKey, authorization: `Bearer ${sb.anonKey}` },
      });
      if (res.status === 200) {
        const body = (await res.json().catch(() => null)) as unknown;
        if (Array.isArray(body) && body.length > 0) {
          return [
            {
              checkKey: KEY,
              title: "Storage buckets are listable with the public key",
              severity: "high",
              passed: false,
              detail:
                "The anon key can list your storage buckets, which usually means over-permissive storage policies.",
              fix: "Tighten storage policies so bucket listing and object access require an authenticated, authorized user.",
            },
          ];
        }
      }
    } catch {
      /* skip */
    }

    return [
      {
        checkKey: KEY,
        title: "Storage not publicly listable",
        severity: "pass",
        passed: true,
        detail: "The public key could not list storage buckets.",
        fix: "",
      },
    ];
  },
};
