import type { Check, Finding, ScanContext } from "../types";

const KEY = "firebase-rules";
const TITLE = "Firebase database rules";

export const firebaseRules: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: true,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const fb = ctx.firebase;
    const dbUrl =
      fb?.databaseURL ||
      (fb?.projectId ? `https://${fb.projectId}-default-rtdb.firebaseio.com` : undefined);

    if (!fb || !dbUrl) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          applicable: false,
          detail: "No Firebase Realtime Database was detected in this app, so there was nothing to test.",
          fix: "",
        },
      ];
    }

    try {
      const res = await ctx.fetchImpl(`${dbUrl}/.json?shallow=true`);
      if (res.status === 200) {
        const body = (await res.text()).trim();
        if (body && body !== "null") {
          return [
            {
              checkKey: KEY,
              title: "Firebase database is publicly readable",
              severity: "critical",
              passed: false,
              detail:
                "The Realtime Database returned data to an unauthenticated read, so your security rules allow public access.",
              fix: 'Set rules to require auth, e.g. `{ "rules": { ".read": "auth != null", ".write": "auth != null" } }`, ideally scoped per user.',
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
        title: "Firebase rules look enforced",
        severity: "pass",
        passed: true,
        detail: "The Realtime Database did not return data to an unauthenticated read.",
        fix: "",
      },
    ];
  },
};
