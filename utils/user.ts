/**
 * Initials for the avatar chip. Accepts a display name or, for accounts
 * created before names were captured, an email address (the local part is
 * treated as the name, with dots/underscores as word breaks).
 */
export function initialsFor(nameOrEmail: string): string {
  const base = (nameOrEmail ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!base) return '?';
  const words = base.split(/\s+/);
  const letters =
    words.length >= 2 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}
