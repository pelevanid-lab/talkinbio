import { Resend } from 'resend';

// Faz 4.4 operasyonel gözlemleme: Sentry/Vercel error tracking bir hesap
// gerektirdiği için (bu ortamda kurulamıyor) admin bildirimleri, projede
// zaten kurulu olan Resend üzerinden e-postayla gidiyor. Asla fırlatmaz —
// bir bildirim hatası, bildirdiği asıl hatayı gölgelememeli.
export async function notifyAdmin(subject: string, body: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_NOTIFICATION_EMAIL) {
    console.warn('[notifyAdmin] skipped — RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not configured', { subject });
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.ADMIN_NOTIFICATION_EMAIL,
      subject,
      html: `<p>${body}</p>`,
    });
  } catch (err) {
    console.error('[notifyAdmin] failed to send notification email', { subject, err });
  }
}
