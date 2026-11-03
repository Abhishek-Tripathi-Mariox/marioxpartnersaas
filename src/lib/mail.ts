import nodemailer, { type Transporter } from 'nodemailer';

// Outgoing email over SMTP. Env: SYSTEM_SMTP_HOST, SYSTEM_SMTP_PORT, SYSTEM_SMTP_USERNAME,
// SYSTEM_SMTP_PASSWORD, SYSTEM_EMAIL_FROM (e.g. "Mariox Partner <partners@marioxsoftware.com>").
// Port 465 uses TLS from the start; 587 upgrades with STARTTLS (Gmail, most providers).

const env = (n: string) => process.env[n]?.trim() || '';
const config = () => ({
  host: env('SYSTEM_SMTP_HOST'),
  port: Number(env('SYSTEM_SMTP_PORT') || 587),
  user: env('SYSTEM_SMTP_USERNAME'),
  pass: env('SYSTEM_SMTP_PASSWORD'),
  from: env('SYSTEM_EMAIL_FROM') || env('SYSTEM_SMTP_USERNAME'),
});

export const mailConfigured = () => { const c = config(); return Boolean(c.host && c.user && c.pass); };

const g = globalThis as unknown as { _mailer?: Transporter };
function transporter() {
  if (!g._mailer) {
    const c = config();
    g._mailer = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465,
      auth: { user: c.user, pass: c.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return g._mailer;
}

export type MailResult = { sent: true; to: string } | { sent: false; to: string; error: string };

// Never throws: the caller shows whether it went out, and the admin can still copy the link.
export async function sendMail(msg: { to: string; subject: string; html: string; text: string }): Promise<MailResult> {
  if (!mailConfigured()) return { sent: false, to: msg.to, error: 'Email is not set up (SYSTEM_SMTP_* in .env.local)' };
  try {
    await transporter().sendMail({ from: config().from, ...msg });
    return { sent: true, to: msg.to };
  } catch (e) {
    console.error('[mail]', (e as Error).message);
    return { sent: false, to: msg.to, error: (e as Error).message.split('\n')[0] };
  }
}

// For /api/health: checks the SMTP login without sending anything.
export async function mailStatus() {
  if (!mailConfigured()) return { mail: 'off' as const };
  try {
    await transporter().verify();
    return { mail: 'up' as const };
  } catch (e) {
    return { mail: 'down' as const, mailError: (e as Error).message.split('\n')[0] };
  }
}
