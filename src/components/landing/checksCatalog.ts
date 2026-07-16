// The scanner's real coverage, grouped the way the runner labels it: one entry per check
// the engine ships (see src/lib/scan/checks/*), so the marketing can't drift from the engine
// and the "nineteen checks" claim matches what's listed.

export interface CheckItem {
  name: string;
  blurb: string;
}

export interface CheckGroup {
  key: string;
  label: string;
  blurb: string;
  /** short flag rendered as a chip, e.g. "needs ownership" or "AI" */
  tag?: string;
  tagTone?: "accent" | "medium";
  items: CheckItem[];
}

export const CHECK_GROUPS: CheckGroup[] = [
  {
    key: "secrets",
    label: "Secrets & exposed files",
    blurb: "The keys and files that should never have left your machine.",
    items: [
      { name: "Secrets in client bundles", blurb: "Stripe, OpenAI, AWS and Supabase service_role keys shipped to the browser." },
      { name: "Public .env / .git", blurb: "Environment files and git internals served to anyone who asks." },
      { name: "Exposed source maps", blurb: "Your original, un-minified source, readable in the browser." },
      { name: "Tokens in browser storage", blurb: "Auth tokens left in localStorage, readable by any script on the page." },
      { name: "Vulnerable dependencies", blurb: "Known-vulnerable libraries riding along in your client bundle." },
    ],
  },
  {
    key: "transport",
    label: "Headers & transport",
    blurb: "The defaults that decide how hard your app is to attack.",
    items: [
      { name: "Security headers", blurb: "CSP, HSTS, clickjacking and referrer protection." },
      { name: "Cookie flags", blurb: "Session cookies left readable by JavaScript." },
      { name: "CORS configuration", blurb: "Over-permissive origins that let other sites read your responses." },
      { name: "Open redirects", blurb: "Redirect endpoints an attacker can point anywhere." },
      { name: "Dangerous HTTP methods", blurb: "TRACE, PUT and friends left enabled on your server." },
      { name: "Content-type enforcement", blurb: "Responses a browser can be tricked into running as code." },
      { name: "Leaked stack traces", blurb: "Server errors spilling internal paths and framework versions." },
      { name: "Sensitive paths in robots.txt", blurb: "Admin and internal routes advertised in robots.txt or the sitemap." },
    ],
  },
  {
    key: "backend",
    label: "Deep backend",
    blurb: "The database checks that need your say-so, run on apps you own.",
    tag: "needs ownership",
    tagTone: "medium",
    items: [
      { name: "Open Supabase tables (RLS)", blurb: "Probes common tables with your anon key for public read and write." },
      { name: "Open Firebase database", blurb: "World-readable rules on Realtime Database or Firestore." },
      { name: "Open storage buckets", blurb: "Public buckets quietly exposing user uploads." },
    ],
  },
  {
    key: "ai",
    label: "AI-specific",
    blurb: "The failure modes unique to apps built with AI, the ones generic scanners miss.",
    tag: "AI",
    tagTone: "accent",
    items: [
      { name: "Client-side LLM keys", blurb: "dangerouslyAllowBrowser and provider keys baked into the bundle." },
      { name: "Leaked system prompts", blurb: "Your prompt and guardrails, sitting in client code." },
      { name: "Prompt injection", blurb: "A benign canary that proves your chat endpoint can be hijacked." },
    ],
  },
];
