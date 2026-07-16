// Thin client for the hosted VibeSafely metering API. The scan itself runs locally; these
// calls only authenticate the key and move credits.

export interface ReserveOk {
  authorized: true;
  subscribed: boolean;
  remainingCredits: number | null;
}

export type ReserveResult =
  | { ok: true; data: ReserveOk }
  | { ok: false; status: number; error: string; code?: string };

function authHeaders(apiKey: string): Record<string, string> {
  return { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
}

export async function reserve(
  apiUrl: string,
  apiKey: string,
  url: string,
): Promise<ReserveResult> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl}/api/mcp/reserve`, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ url }),
    });
  } catch {
    return { ok: false, status: 0, error: `Could not reach ${apiUrl}. Is VIBESAFELY_API_URL correct?` };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: data.error ?? "Authorization failed.", code: data.code };
  }
  return { ok: true, data: data as ReserveOk };
}

export async function refund(apiUrl: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${apiUrl}/api/mcp/refund`, { method: "POST", headers: authHeaders(apiKey) });
  } catch {
    // best-effort
  }
}

export async function me(
  apiUrl: string,
  apiKey: string,
): Promise<{ credits: number; subscribed: boolean } | null> {
  try {
    const res = await fetch(`${apiUrl}/api/mcp/me`, { headers: authHeaders(apiKey) });
    if (!res.ok) return null;
    return (await res.json()) as { credits: number; subscribed: boolean };
  } catch {
    return null;
  }
}
