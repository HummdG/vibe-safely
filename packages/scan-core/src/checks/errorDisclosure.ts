import type { Check, Finding, ScanContext } from "../types";

const KEY = "error-disclosure";
const TITLE = "Error & version disclosure";

// Signatures of a leaked stack trace / framework error page across common stacks.
const STACK_SIG =
  /Traceback \(most recent call last\)|at Object\.<anonymous>|\bat [\w$.]+ \(\/|webpack-internal:|NoReverseMatch|SQLSTATE\[|Fatal error:|\.java:\d+\)|goroutine \d+ \[|System\.Web\./;

export const errorDisclosure: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const h = ctx.headers;

    // Version disclosure, straight from the homepage response we already have.
    const disclosers: string[] = [];
    if (/\d/.test(h["server"] || "")) disclosers.push(`Server: ${h["server"]}`);
    if (h["x-powered-by"]) disclosers.push(`X-Powered-By: ${h["x-powered-by"]}`);
    if (h["x-aspnet-version"]) disclosers.push(`X-AspNet-Version: ${h["x-aspnet-version"]}`);
    if (disclosers.length > 0) {
      findings.push({
        checkKey: KEY,
        title: "Server/framework version disclosed in headers",
        severity: "low",
        category: "hardening",
        passed: false,
        detail: `Response headers reveal your stack and version (${disclosers.join("; ")}). That tells an attacker exactly which known exploits to try.`,
        fix: "Remove or genericize `Server`, `X-Powered-By` and `X-AspNet-Version` headers at your app or proxy.",
        evidence: disclosers[0],
      });
    }

    // Stack traces on the homepage, or a benign 404 probe.
    let leaked = STACK_SIG.test(ctx.html);
    if (!leaked) {
      try {
        const res = await ctx.fetchImpl(ctx.origin + "/.well-known/vibesafely-probe-404", {
          redirect: "manual",
        });
        leaked = STACK_SIG.test((await res.text()).slice(0, 8192));
      } catch {
        /* skip */
      }
    }
    if (leaked) {
      findings.push({
        checkKey: KEY,
        title: "Stack trace / internal error leaked",
        severity: "medium",
        category: "hardening",
        passed: false,
        detail:
          "The app returned a stack trace or framework error page. These leak file paths, library versions and internal structure that make other attacks easier.",
        fix: "Turn off debug/verbose errors in production, return generic error pages, and log the details server-side instead.",
      });
    }

    if (findings.length === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No stack traces or version-disclosing headers were seen.",
          fix: "",
        },
      ];
    }
    return findings;
  },
};
