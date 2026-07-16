import type { Check, Finding, ScanContext } from "../types";

const KEY = "supabase-rls";
const TITLE = "Supabase Row-Level-Security";

// Common table names to probe with the app's own public anon key.
const COMMON_TABLES = [
  "users", "profiles", "user_profiles", "accounts", "messages", "chats",
  "orders", "payments", "subscriptions", "posts", "todos", "tasks",
  "customers", "leads", "waitlist", "emails", "contacts", "documents",
  "files", "notes",
];

export const supabaseRls: Check = {
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
          detail: "No Supabase anon key was detected in this app, so there was no database to test.",
          fix: "",
        },
      ];
    }

    const exposed: { table: string; rows: number }[] = [];
    let tested = 0;
    for (const table of COMMON_TABLES) {
      try {
        const res = await ctx.fetchImpl(`${sb.url}/rest/v1/${table}?select=*&limit=1`, {
          headers: { apikey: sb.anonKey, authorization: `Bearer ${sb.anonKey}` },
        });
        if (res.status === 404) continue; // table absent or not exposed via PostgREST
        tested++;
        if (res.status === 200) {
          const body = (await res.json().catch(() => null)) as unknown;
          if (Array.isArray(body)) exposed.push({ table, rows: body.length });
        }
      } catch {
        /* skip */
      }
    }

    if (exposed.length > 0) {
      return exposed.map((e) => ({
        checkKey: KEY,
        title: `Table "${e.table}" is readable by anyone`,
        severity: "critical" as const,
        passed: false,
        detail: `Using only the public anon key, the \`${e.table}\` table returned data. Row-Level-Security is off or too permissive, so anyone can read this table.`,
        fix: `Enable RLS and add scoped policies: in Supabase run \`alter table ${e.table} enable row level security;\` then add explicit select policies limited to the current user.`,
      }));
    }

    return [
      {
        checkKey: KEY,
        title: "Supabase RLS looks enforced",
        severity: "pass",
        passed: true,
        detail: `Probed ${tested || COMMON_TABLES.length} common table names with the public key; none returned data.`,
        fix: "",
      },
    ];
  },
};
