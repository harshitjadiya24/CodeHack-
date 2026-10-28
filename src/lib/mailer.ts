import "server-only";

// Transactional email through Brevo's free tier (300 emails a day, any recipient once the sender is verified).
// https://developers.brevo.com/reference/sendtransacemail

export type MailResult = { ok: true } | { ok: false; error: string };

export function mailConfigured() {
  return !!process.env.BREVO_API_KEY && !!process.env.MAIL_FROM_EMAIL;
}

export async function sendMail(to: { email: string; name?: string }, subject: string, text: string, html: string): Promise<MailResult> {
  if (!mailConfigured()) {
    // Local development without a key: print instead of failing, so the flow can still be tried.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:dev] to=${to.email} subject="${subject}"\n${text}`);
      return { ok: true };
    }
    return { ok: false, error: "Email isn’t set up on this server yet." };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM_EMAIL, name: process.env.MAIL_FROM_NAME || "Saajha" },
        to: [{ email: to.email, name: to.name }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[mail] Brevo ${res.status}: ${await res.text().catch(() => "")}`);
      return { ok: false, error: "We couldn’t send the email just now. Try again in a minute." };
    }
    return { ok: true };
  } catch (e) {
    console.error("[mail] Brevo request failed", e);
    return { ok: false, error: "We couldn’t send the email just now. Try again in a minute." };
  }
}

/** The sign-up code email. Plain, readable without images, and the code is the first thing you see. */
export function codeEmail(name: string, code: string) {
  const first = name.split(" ")[0];
  const text = `Your Saajha code is ${code}\n\nHi ${first}, enter this code to confirm your email. It expires in 10 minutes.\n\nIf you didn't create a Saajha account, ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f3;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#141414">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:2px solid #141414;border-radius:8px">
<tr><td style="background:#f2c230;padding:14px 20px;font-weight:800;font-size:15px;letter-spacing:.02em;border-bottom:2px solid #141414">SAAJHA</td></tr>
<tr><td style="padding:24px 20px">
<p style="margin:0 0 8px;font-size:16px">Hi ${first}, here is your code:</p>
<p style="margin:0 0 16px;font-size:40px;font-weight:800;letter-spacing:.12em;font-variant-numeric:tabular-nums">${code}</p>
<p style="margin:0 0 8px;font-size:15px;color:#5e5e58">Enter it on the sign-up page to confirm your email. It expires in 10 minutes.</p>
<p style="margin:16px 0 0;font-size:13px;color:#5e5e58">If you didn’t create a Saajha account, ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: `Your Saajha code is ${code}`, text, html };
}
