// Detects dangerous secrets that should never be shipped to the browser.
// Publishable/anon keys (pk_, Supabase anon JWT, Firebase apiKey) are expected
// client-side and are NOT flagged here (Firebase apiKey is handled as low/info).

import { decodeJwt } from "./jwt";
import type { Severity } from "./types";

export interface SecretHit {
  type: string;
  severity: Severity;
  evidence: string;
  fix: string;
}

interface Pattern {
  type: string;
  re: RegExp;
  severity: Severity;
  fix: string;
}

const PATTERNS: Pattern[] = [
  {
    type: "Stripe secret key",
    re: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g,
    severity: "critical",
    fix: "Roll the key in the Stripe dashboard now and move it to a server-only env var. Only the publishable key (pk_) belongs in the browser.",
  },
  {
    type: "Stripe test secret key",
    re: /\bsk_test_[A-Za-z0-9]{20,}\b/g,
    severity: "medium",
    fix: "Remove the test secret key from client code; the browser should only ever use a publishable key.",
  },
  {
    type: "Anthropic API key",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    severity: "critical",
    fix: "Revoke the key in the Anthropic console and call the API only from your server.",
  },
  {
    type: "OpenAI API key",
    re: /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{20,}\b|\bsk-[A-Za-z0-9]{40,}\b/g,
    severity: "critical",
    fix: "Revoke the key in the OpenAI dashboard and proxy all AI calls through your backend.",
  },
  {
    type: "Groq API key",
    re: /\bgsk_[A-Za-z0-9]{32,64}\b/g,
    severity: "critical",
    fix: "Revoke the key in the Groq console and call the model only from your server.",
  },
  {
    type: "Perplexity API key",
    re: /\bpplx-[A-Za-z0-9]{40,56}\b/g,
    severity: "critical",
    fix: "Revoke the key in the Perplexity dashboard and proxy calls through your backend.",
  },
  {
    type: "Replicate API token",
    re: /\br8_[A-Za-z0-9]{35,40}\b/g,
    severity: "critical",
    fix: "Revoke the token in Replicate and move inference calls to your server.",
  },
  {
    type: "Hugging Face token",
    re: /\bhf_[A-Za-z0-9]{30,40}\b/g,
    severity: "critical",
    fix: "Revoke the token in Hugging Face settings and keep it server-side.",
  },
  {
    type: "xAI (Grok) API key",
    re: /\bxai-[A-Za-z0-9]{60,120}\b/g,
    severity: "critical",
    fix: "Revoke the key in the xAI console and proxy calls through your backend.",
  },
  {
    type: "OpenRouter API key",
    re: /\bsk-or-v1-[A-Za-z0-9_-]{32,}\b/g,
    severity: "critical",
    fix: "Revoke the key in OpenRouter and route model calls through your server.",
  },
  {
    type: "AWS access key id",
    re: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    fix: "Deactivate the key in AWS IAM and rotate credentials. AWS keys must never be embedded client-side.",
  },
  {
    type: "Private key",
    re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
    severity: "critical",
    fix: "Remove the private key from your bundle and rotate it immediately. Private keys must never reach the client.",
  },
  {
    type: "Google API key",
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    severity: "low",
    fix: "Google/Firebase browser keys are public by design, but restrict them by HTTP referrer and allowed APIs in the Google Cloud console to prevent abuse.",
  },
];

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

export function scanForSecrets(text: string): SecretHit[] {
  const hits: SecretHit[] = [];
  const seen = new Set<string>();

  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(text)) !== null) {
      const dedupe = p.type + ":" + m[0];
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      hits.push({ type: p.type, severity: p.severity, evidence: mask(m[0]), fix: p.fix });
    }
  }

  // Supabase service_role JWTs bypass Row-Level-Security, critical if shipped.
  JWT_RE.lastIndex = 0;
  let jm: RegExpExecArray | null;
  while ((jm = JWT_RE.exec(text)) !== null) {
    const token = jm[0];
    const payload = decodeJwt(token);
    if (payload?.role === "service_role") {
      const dedupe = "service_role:" + token;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      hits.push({
        type: "Supabase service_role key",
        severity: "critical",
        evidence: mask(token),
        fix: "This key bypasses Row-Level-Security and grants full database access. Roll it in Supabase (Settings → API), remove it from client code, and use it only on the server.",
      });
    }
  }

  return hits;
}

export function mask(s: string): string {
  if (s.length <= 10) return s.slice(0, 2) + "…";
  return s.slice(0, 6) + "…" + s.slice(-4);
}
