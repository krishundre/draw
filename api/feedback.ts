// Minimal local shape of what Vercel's Node runtime hands a serverless
// function — avoids depending on @vercel/node purely for types (its
// transitive deps have had a long tail of advisories; Vercel's actual
// deploy-time builder doesn't use this package at all, so it isn't worth
// the dependency weight for a types-only import).
interface VercelRequest {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

// Best-effort in-memory rate limit: N requests per IP per window. This is not
// perfectly robust — a serverless function can have multiple concurrent
// instances that don't share this Map, and it resets on a cold start — but it
// costs no extra infrastructure/dependency and stops the common case (a
// single script hammering the endpoint from one place), which is what the
// honeypot alone doesn't cover. A shared store (Vercel KV/Upstash) would be
// needed for a airtight global limit across all instances.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  // opportunistically prevent unbounded growth across many distinct IPs
  if (requestLog.size > 5000) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }
  return timestamps.length > RATE_LIMIT_MAX;
}

function getClientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  return first?.split(",")[0]?.trim() || "unknown";
}

interface FeedbackBody {
  name?: string;
  email?: string;
  type?: "bug" | "feature" | "general";
  message?: string;
  // honeypot: real users never fill this in (it's hidden via CSS); bots that
  // auto-fill every field trip it.
  website?: string;
}

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug report",
  feature: "Feature request",
  general: "General feedback",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (isRateLimited(getClientIp(req))) {
    return res.status(429).json({ error: "Too many requests. Please try again in a few minutes." });
  }

  const body = (req.body ?? {}) as FeedbackBody;

  // Honeypot: silently pretend success so bots don't learn anything.
  if (body.website) {
    return res.status(200).json({ ok: true });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: "Message is too long (max 5000 characters)." });
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return res.status(400).json({ error: "That email address doesn't look valid." });
  }
  if ((body.name?.length ?? 0) > 200) {
    return res.status(400).json({ error: "Name is too long (max 200 characters)." });
  }
  if ((body.email?.length ?? 0) > 200) {
    return res.status(400).json({ error: "Email is too long (max 200 characters)." });
  }

  // Strip stray BOM/whitespace some tooling adds when setting env vars
  // (a leading U+FEFF here breaks fetch's header encoding with a cryptic error).
  const BOM = String.fromCharCode(0xfeff);
  const clean = (v: string | undefined) => v?.split(BOM).join("").trim();

  const apiKey = clean(process.env.RESEND_API_KEY);
  const toEmail = clean(process.env.FEEDBACK_TO_EMAIL) || "chef@designpav.in";
  const fromEmail = clean(process.env.RESEND_FROM_EMAIL) || "DrawBoard Feedback <onboarding@resend.dev>";

  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return res.status(500).json({ error: "Feedback isn't configured on the server yet." });
  }

  const name = (body.name ?? "").trim() || "Anonymous";
  const type = TYPE_LABELS[body.type ?? "general"] ?? "General feedback";
  const replyTo = body.email?.trim();

  const html = `
    <div style="font-family: -apple-system, sans-serif; line-height: 1.5;">
      <p><strong>Type:</strong> ${escapeHtml(type)}</p>
      <p><strong>From:</strong> ${escapeHtml(name)}${replyTo ? ` (${escapeHtml(replyTo)})` : " (no email given)"}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap; border-left: 3px solid #ccc; padding-left: 12px;">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `[DrawBoard feedback] ${type} from ${name}`,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errText);
      return res.status(502).json({ error: "Could not send feedback right now. Please try again later." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Feedback send failed:", err);
    return res.status(500).json({ error: "Could not send feedback right now. Please try again later." });
  }
}
