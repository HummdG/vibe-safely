import type { Check, Finding, ScanContext } from "../types";

const KEY = "insecure-storage";
const TITLE = "Insecure client-side storage";

// Keys that suggest an auth secret is being written to Web Storage.
const SENSITIVE_KEY =
  /token|jwt|auth|session|secret|api[_-]?key|password|credential|access|refresh|bearer/i;

export const insecureStorage: Check = {
  key: KEY,
  title: TITLE,
  requiresOwnership: false,
  async run(ctx: ScanContext): Promise<Finding[]> {
    const text = ctx.html + "\n" + ctx.bundles.map((b) => b.content).join("\n");
    const hits = new Set<string>();

    // localStorage.setItem("access_token", …) / sessionStorage.setItem('jwt', …)
    const setItemRe = /(?:local|session)Storage\.setItem\(\s*["'`]([^"'`]{1,60})["'`]/g;
    let m: RegExpExecArray | null;
    while ((m = setItemRe.exec(text)) !== null) {
      if (SENSITIVE_KEY.test(m[1])) hits.add(m[1]);
    }
    // localStorage["token"] = …  /  localStorage.token = …
    const assignRe =
      /(?:local|session)Storage(?:\.([A-Za-z_$][\w$]*)|\[\s*["'`]([^"'`]{1,60})["'`]\s*\])\s*=/g;
    while ((m = assignRe.exec(text)) !== null) {
      const key = m[1] || m[2];
      if (key && SENSITIVE_KEY.test(key)) hits.add(key);
    }

    if (hits.size === 0) {
      return [
        {
          checkKey: KEY,
          title: TITLE,
          severity: "pass",
          passed: true,
          detail: "No auth tokens were seen written to localStorage/sessionStorage.",
          fix: "",
        },
      ];
    }

    const keys = [...hits].slice(0, 5);
    return [
      {
        checkKey: KEY,
        title: "Auth token stored in browser storage",
        severity: "low",
        category: "vulnerability",
        passed: false,
        detail: `Your code writes what looks like a credential to Web Storage (e.g. \`${keys[0]}\`). Anything in localStorage/sessionStorage is readable by any script on the page, so a single XSS steals the token.`,
        fix: "Keep session tokens in `HttpOnly` cookies instead of localStorage/sessionStorage, so JavaScript can't read them.",
        evidence: keys.join(", "),
      },
    ];
  },
};
