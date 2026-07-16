// Detects which backend an app uses (Supabase / Firebase) from its HTML + JS,
// so the active checks know what public endpoints to probe.

import type { SupabaseInfo, FirebaseInfo } from "./types";
import { decodeJwt } from "./jwt";

export function detectSupabase(text: string): SupabaseInfo | undefined {
  const urlMatch = text.match(/https:\/\/([a-z0-9]{16,})\.supabase\.co/);
  if (!urlMatch) return undefined;
  const ref = urlMatch[1];
  const url = `https://${ref}.supabase.co`;

  // Find the matching anon key (a JWT whose payload has ref + role "anon").
  const jwtRe = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
  let anonKey: string | undefined;
  let m: RegExpExecArray | null;
  while ((m = jwtRe.exec(text)) !== null) {
    const p = decodeJwt(m[0]);
    if (p && p.ref === ref && p.role === "anon") {
      anonKey = m[0];
      break;
    }
  }
  return { url, ref, anonKey };
}

export function detectFirebase(text: string): FirebaseInfo | undefined {
  const looksFirebase = /firebase|firestore|firebaseio|firebaseapp/.test(text);
  const databaseURL = text.match(
    /["']?databaseURL["']?\s*[:=]\s*["'](https:\/\/[^"']+firebaseio[^"']*)["']/,
  )?.[1];
  if (!looksFirebase && !databaseURL) return undefined;

  const apiKey =
    text.match(/["']?apiKey["']?\s*[:=]\s*["'](AIza[0-9A-Za-z_-]{35})["']/)?.[1];
  // projectId can come from the explicit key, or be recovered from the
  // authDomain (<id>.firebaseapp.com) / storageBucket (<id>.appspot.com).
  const projectId =
    text.match(/["']?projectId["']?\s*[:=]\s*["']([a-z0-9-]{4,})["']/)?.[1] ||
    text.match(/["']([a-z0-9-]{4,})\.firebaseapp\.com["']/)?.[1] ||
    text.match(/["']([a-z0-9-]{4,})\.appspot\.com["']/)?.[1];

  if (!apiKey && !projectId && !databaseURL) return undefined;
  return { apiKey, projectId, databaseURL };
}
