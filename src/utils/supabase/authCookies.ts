type CookieLike = { name: string };

/**
 * Supabase stores sessions in `sb-<project-ref>-auth-token` cookies. Large
 * sessions may be split into numbered chunks, so matching the base name is
 * not sufficient.
 */
export function hasSupabaseAuthCookie(cookies: CookieLike[]): boolean {
  return cookies.some(({ name }) => /^sb-[^-]+-auth-token(?:\.\d+)?$/.test(name));
}
