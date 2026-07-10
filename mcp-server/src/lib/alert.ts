/**
 * Out-of-band founder alert (capability multi-user-auth, 2026-07-10).
 *
 * WHY. On 2026-07-03 supabase-ops died at boot with a revoked refresh token. It wrote
 * `FATAL: ...` to stderr — which nothing reads — and simply failed to register its tools.
 * Every downstream per-human gate (analytics, the gbrain hook) went dark within the hour.
 * Nobody noticed for SEVEN DAYS, and only then by accident: an unrelated session reported
 * that two of its three data sources were unreachable.
 *
 * The seven days of silence, not the one-hour token lifetime, was the actual damage. A
 * process that guards access must be loud when it dies.
 *
 * Delivery is best-effort and deliberately dependency-free: a bare `fetch` to Telegram,
 * short timeout, every error swallowed. An alerting path that can itself throw would turn
 * a recoverable boot failure into an unrecoverable one — the exact inversion we are fixing.
 * Credentials come straight from the process env (the `.mcp.json` wrapper sources
 * `.env.local`); when they are absent this is a silent no-op, as on a fresh clone or CI.
 */

const TELEGRAM_TIMEOUT_MS = 4_000;

export interface AlertResult {
  delivered: boolean;
  /** Why not, when `delivered` is false. For the stderr log, never for control flow. */
  reason?: string;
}

/** Injectable for tests; defaults to global fetch. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number }>;

/**
 * Send `text` to the founder's Telegram chat. Never throws, never rejects.
 *
 * `env` defaults to `process.env` so callers do not have to thread it through; the
 * parameter exists so tests can drive both the configured and unconfigured paths.
 */
export async function notifyFounder(
  text: string,
  env: NodeJS.ProcessEnv = process.env,
  doFetch: FetchLike = fetch as unknown as FetchLike,
): Promise<AlertResult> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_FOUNDER_CHAT_ID?.trim();
  if (!token || !chatId) {
    return { delivered: false, reason: "TELEGRAM_BOT_TOKEN / TELEGRAM_FOUNDER_CHAT_ID not set" };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const r = await doFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: ac.signal,
    });
    return r.ok ? { delivered: true } : { delivered: false, reason: `telegram HTTP ${r.status}` };
  } catch (e) {
    return { delivered: false, reason: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Compose the credential-revoked alert. Kept pure + exported so a test can assert that the
 * message names the remedy — an alert that says only "it broke" would have saved little of
 * those seven days.
 */
export function revokedCredentialAlert(opts: {
  email: string | null;
  selfHealed: boolean;
  detail: string;
}): string {
  const head = opts.selfHealed
    ? "🟡 Ritsu · supabase-ops — thẻ bị thu hồi, ĐÃ TỰ CHỮA"
    : "🔴 Ritsu · supabase-ops — thẻ bị thu hồi, KHÔNG BOOT ĐƯỢC";
  const lines = [
    head,
    `👤 ${opts.email ?? "(không rõ operator)"}`,
    `⚠️ ${opts.detail}`,
  ];
  if (opts.selfHealed) {
    lines.push("✅ Đã mint thẻ mới và lưu lại. Khởi động lại Claude để dùng.");
  } else {
    lines.push("🛠 Chạy: node scripts/multi-user-auth/enroll.cjs \"<magic-link>\"");
    lines.push("   (magic-link: Supabase Dashboard → ritsu-ops → Authentication)");
  }
  lines.push("📉 Trong lúc chờ: analytics + gbrain sẽ từ chối sau ~1h.");
  return lines.join("\n");
}
