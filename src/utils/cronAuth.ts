/**
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` on scheduled invocations.
 * Route handlers under /api/cron/* must call this before doing any work so the
 * endpoint can't be triggered by an anonymous request against real customer data.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}
