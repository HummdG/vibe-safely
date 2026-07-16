// Turns a finding into an actionable fix: a copy-ready AI prompt (tailored to the
// detected stack) plus a canonical before→after example patch. Deterministic, no
// LLM call. VibeSafely can't touch the user's repo, so the prompt is meant to be pasted
// into Cursor / Claude / their AI editor to apply the fix in their own codebase.

import type { Finding, FixPatch, ScanContext } from "./types";

export function detectStack(ctx: ScanContext): string[] {
  const stack: string[] = [];
  if (ctx.bundles.some((b) => b.url.includes("/_next/"))) stack.push("Next.js");
  if (ctx.supabase) stack.push("Supabase");
  if (ctx.firebase) stack.push("Firebase");
  return stack;
}

// Representative patch per check. The PROMPT is always specific to the finding; the
// patch is a canonical example the user's AI editor adapts to their code.
const FIX_EXAMPLES: Record<string, FixPatch> = {
  // "bundle-secrets" is intentionally absent; its patch is chosen per detected secret
  // type in secretPatch() below, so a Stripe key never gets an OpenAI diff.
  "exposed-files": {
    lang: "text",
    before: `# /.env and /.git are served publicly (no rule blocking dotfiles)`,
    after: `# block dotfiles at your host/CDN. nginx example:\nlocation ~ /\\.(env|git) { deny all; return 404; }`,
  },
  "source-maps": {
    lang: "ts",
    before: `// next.config.ts\nproductionBrowserSourceMaps: true,`,
    after: `// next.config.ts: don't ship .map files to production\nproductionBrowserSourceMaps: false,`,
  },
  "security-headers": {
    lang: "ts",
    before: `// next.config.ts: no security headers set`,
    after: `// next.config.ts\nasync headers() {\n  return [{ source: "/(.*)", headers: [\n    { key: "Content-Security-Policy", value: "default-src 'self'" },\n    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },\n    { key: "X-Frame-Options", value: "DENY" },\n    { key: "X-Content-Type-Options", value: "nosniff" },\n    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },\n  ]}];\n}`,
  },
  "cookie-security": {
    lang: "ts",
    before: `res.cookie("session", id)`,
    after: `res.cookie("session", id, {\n  httpOnly: true,   // JS can't read it\n  secure: true,     // HTTPS only\n  sameSite: "lax",  // CSRF protection\n})`,
  },
  "insecure-storage": {
    lang: "ts",
    before: `localStorage.setItem("auth_token", token)`,
    after: `// don't put tokens in JS-readable storage. Set an HttpOnly cookie server-side:\nres.cookie("session", token, { httpOnly: true, secure: true, sameSite: "lax" })`,
  },
  "llm-client-side": {
    lang: "ts",
    before: `const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })`,
    after: `// proxy through your server so the key never reaches the browser\nawait fetch("/api/ai", { method: "POST", body: JSON.stringify({ prompt }) })`,
  },
  "llm-system-prompt": {
    lang: "ts",
    before: `// client bundle\nconst systemPrompt = "You are …"`,
    after: `// keep it server-side: app/api/ai/route.ts\nconst systemPrompt = "You are …" // never sent to the browser`,
  },
  "supabase-rls": {
    lang: "sql",
    before: `-- RLS off: the table is readable by anyone with the anon key`,
    after: `alter table public.users enable row level security;\ncreate policy "own rows only" on public.users\n  for select using (auth.uid() = user_id);`,
  },
  "firebase-rules": {
    lang: "json",
    before: `{ "rules": { ".read": true, ".write": true } }`,
    after: `{ "rules": { ".read": "auth != null", ".write": "auth != null" } }`,
  },
  "storage-buckets": {
    lang: "sql",
    before: `-- storage objects readable with the public key`,
    after: `create policy "authed only" on storage.objects\n  for select using (auth.role() = 'authenticated');`,
  },
  "dependency-scan": {
    lang: "json",
    before: `// package.json: a known-vulnerable version\n"jquery": "3.4.1"`,
    after: `// package.json: bump to the patched version, then reinstall\n"jquery": "^3.5.0"`,
  },
  "content-type-confusion": {
    lang: "ts",
    before: `// app/api/route.ts: parses whatever body it's handed`,
    after: `// reject anything that isn't JSON\nif (req.headers.get("content-type") !== "application/json") {\n  return new Response("Unsupported Media Type", { status: 415 });\n}`,
  },
  "open-redirect": {
    lang: "ts",
    before: `redirect(req.query.next)`,
    after: `// only allow relative paths (or an allow-list of hosts)\nconst next = String(req.query.next || "/");\nredirect(next.startsWith("/") && !next.startsWith("//") ? next : "/")`,
  },
};

const CORS_EXAMPLE: FixPatch = {
  lang: "ts",
  before: `app.use(cors({ origin: "*", credentials: true }))`,
  after: `app.use(cors({\n  origin: ["https://yourapp.com"], // allow-list, never "*" with credentials\n  credentials: true,\n}))`,
};

// A patch tailored to the exact secret found, keyed by SecretHit.type (see secrets.ts).
// Each shows the real remediation for that credential, not a stand-in for another vendor.
const SECRET_FIX_EXAMPLES: Record<string, FixPatch> = {
  "Stripe secret key": {
    lang: "ts",
    before: `// client bundle: your Stripe SECRET key is public here\nconst stripe = new Stripe("sk_live_…");`,
    after: `// keep secret-key work on the server; browser holds only pk_live_…\n// app/api/checkout/route.ts\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);`,
  },
  "Stripe test secret key": {
    lang: "ts",
    before: `// client bundle: a Stripe test secret key is exposed\nconst stripe = new Stripe("sk_test_…");`,
    after: `// browser holds only a publishable key; keep secrets server-side\n// app/api/checkout/route.ts\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);`,
  },
  "AWS access key id": {
    lang: "ts",
    before: `// client bundle: AWS credentials shipped to the browser\nconst s3 = new S3Client({\n  credentials: { accessKeyId: "AKIA…", secretAccessKey: "…" },\n});`,
    after: `// rotate the key in IAM, then call your server (never ship AWS keys)\n// app/api/upload/route.ts\nconst s3 = new S3Client({}); // creds come from server env / IAM role`,
  },
  "Supabase service_role key": {
    lang: "ts",
    before: `// browser: service_role bypasses Row-Level-Security (full DB access)\nconst supabase = createClient(url, SUPABASE_SERVICE_ROLE);`,
    after: `// the browser uses the anon key; service_role stays server-only\nconst supabase = createClient(url, SUPABASE_ANON_KEY);`,
  },
  "Private key": {
    lang: "text",
    before: `# a PRIVATE KEY is embedded in your client bundle (shipped to every visitor)\n-----BEGIN PRIVATE KEY-----\nMIIE…\n-----END PRIVATE KEY-----`,
    after: `# remove it from client code and ROTATE it now: assume it is already compromised.\n# private keys belong in server-only env/secrets, never in a browser bundle.`,
  },
  "Google API key": {
    lang: "text",
    before: `# a Google/Firebase browser key (AIza…) with no restrictions`,
    after: `# Google Cloud console → Credentials → restrict this key:\n#   • Application restriction: HTTP referrers → your domain(s)\n#   • API restriction: only the APIs you actually use`,
  },
};

// LLM provider keys all share one correct fix: the key lives in server env and the browser
// calls your own route, but the SDK constructor differs per vendor. Each entry renders the
// diff in that vendor's real SDK so it reads like the user's own code.
const AI_KEY_SDK: Record<string, { call: (key: string) => string; env: string }> = {
  "OpenAI API key": { call: (k) => `new OpenAI({ apiKey: ${k} })`, env: "OPENAI_API_KEY" },
  "Anthropic API key": { call: (k) => `new Anthropic({ apiKey: ${k} })`, env: "ANTHROPIC_API_KEY" },
  "Groq API key": { call: (k) => `new Groq({ apiKey: ${k} })`, env: "GROQ_API_KEY" },
  "Perplexity API key": { call: (k) => `new OpenAI({ baseURL: "https://api.perplexity.ai", apiKey: ${k} })`, env: "PERPLEXITY_API_KEY" },
  "Replicate API token": { call: (k) => `new Replicate({ auth: ${k} })`, env: "REPLICATE_API_TOKEN" },
  "Hugging Face token": { call: (k) => `new HfInference(${k})`, env: "HF_TOKEN" },
  "xAI (Grok) API key": { call: (k) => `new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: ${k} })`, env: "XAI_API_KEY" },
  "OpenRouter API key": { call: (k) => `new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: ${k} })`, env: "OPENROUTER_API_KEY" },
};

function aiKeyPatch(sdk: { call: (key: string) => string; env: string }): FixPatch {
  return {
    lang: "ts",
    before: `// client bundle: your API key ships to every visitor\nconst ai = ${sdk.call('"…"')};`,
    after: `// keep the key in server env; browser calls your own route\n// app/api/ai/route.ts\nconst ai = ${sdk.call(`process.env.${sdk.env}`)};\n// browser:\nawait fetch("/api/ai", { method: "POST", body: JSON.stringify({ prompt }) });`,
  };
}

// Fallback for any secret we don't have a bespoke example for: still the correct shape.
// Move it out of the bundle into a server-only env var.
const GENERIC_SECRET_PATCH: FixPatch = {
  lang: "ts",
  before: `// client bundle: a secret key is readable by anyone who views source\nconst KEY = "…"; // shipped to the browser`,
  after: `// rotate the key, then keep it in a server-only env var and use it only on the server\nconst KEY = process.env.SECRET_KEY; // never imported into client code`,
};

function secretPatch(type?: string): FixPatch {
  if (type && SECRET_FIX_EXAMPLES[type]) return SECRET_FIX_EXAMPLES[type];
  if (type && AI_KEY_SDK[type]) return aiKeyPatch(AI_KEY_SDK[type]);
  return GENERIC_SECRET_PATCH;
}

function exampleFor(finding: Finding): FixPatch | undefined {
  if (/CORS/i.test(finding.title)) return CORS_EXAMPLE;
  // Exposed-secret patches are chosen by the specific credential, not the check.
  if (finding.checkKey === "bundle-secrets") return secretPatch(finding.secretType);
  return FIX_EXAMPLES[finding.checkKey];
}

export function buildFixPrompt(finding: Finding, stack: string[]): string {
  const stackLine = stack.length ? ` My stack: ${stack.join(", ")}.` : "";
  const evidence = finding.evidence ? `\n- Evidence (masked): ${finding.evidence}` : "";
  return [
    `I'm fixing a security issue in my web app.${stackLine}`,
    ``,
    `A security scan (VibeSafely) reported:`,
    `- Issue: ${finding.title} [${finding.severity}]`,
    `- What it means: ${finding.detail}`,
    `- Recommended fix: ${finding.fix}${evidence}`,
    ``,
    `Find the relevant code in my project and apply a production-ready fix. Show me the diff, explain what changed, and don't introduce regressions.`,
  ].join("\n");
}

export function attachFixes(findings: Finding[], stack: string[]): Finding[] {
  return findings.map((f) =>
    f.passed ? f : { ...f, fixPrompt: buildFixPrompt(f, stack), fixPatch: exampleFor(f) },
  );
}
