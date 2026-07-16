import type { Check, Finding, Severity, ScanContext } from "../types";

const KEY = "exposed-files";
const TITLE = "Publicly exposed config/source files";

interface Target {
  path: string;
  label: string;
  severity: Severity;
  fix: string;
  /** content signature so SPA 200-fallbacks don't false-positive */
  sig: (body: string, contentType: string) => boolean;
}

const notHtml = (body: string, ct: string) =>
  !ct.includes("html") && !/<!doctype|<html/i.test(body);

const TARGETS: Target[] = [
  {
    path: "/.env",
    label: "Environment file (.env)",
    severity: "critical",
    sig: (b, ct) => notHtml(b, ct) && /^[A-Z0-9_]+=.*/m.test(b),
    fix: "Stop serving .env from your deployment, add it to your ignore rules, and rotate every secret it contained.",
  },
  {
    path: "/.env.local",
    label: "Environment file (.env.local)",
    severity: "critical",
    sig: (b, ct) => notHtml(b, ct) && /^[A-Z0-9_]+=.*/m.test(b),
    fix: "Remove .env.local from your deploy output and rotate any exposed secrets.",
  },
  {
    path: "/.git/config",
    label: "Git config (.git exposed)",
    severity: "high",
    sig: (b) => /\[core\]/.test(b) && /repositoryformatversion/i.test(b),
    fix: "Your .git directory is publicly served. Block access to dotfiles/.git at your host or CDN.",
  },
  {
    path: "/.git/HEAD",
    label: "Git HEAD (.git exposed)",
    severity: "high",
    sig: (b) => /^ref:\s+refs\//.test(b.trim()),
    fix: "Block public access to the .git directory at your host or CDN.",
  },
];

export const exposedFiles: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const found: Finding[] = [];
    for (const t of TARGETS) {
      try {
        const res = await ctx.fetchImpl(ctx.origin + t.path, { redirect: "manual" });
        if (res.status !== 200) continue;
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        const body = (await res.text()).slice(0, 4096);
        if (t.sig(body, ct)) {
          found.push({
            checkKey: KEY,
            title: `${t.label} is publicly accessible`,
            severity: t.severity,
            passed: false,
            detail: `\`${t.path}\` returned 200 with file-like content, so it is readable by anyone on the internet.`,
            fix: t.fix,
          });
        }
      } catch {
        /* skip unreachable path */
      }
    }

    if (found.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "Common sensitive files (.env, .git) were not publicly accessible.",
          fix: "",
        },
      ];
    }
    return found;
  },
};
