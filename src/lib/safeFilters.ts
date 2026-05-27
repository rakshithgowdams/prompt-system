/**
 * Escape a user-supplied string for safe use inside a PostgREST .or() / .ilike() filter.
 * PostgREST treats commas, parentheses, periods, asterisks, and backticks as metacharacters.
 * We percent-encode them so they are treated as literals, then cap length to prevent abuse.
 */
export function escapePostgrestLike(value: string): string {
  return value
    .trim()
    .slice(0, 100)
    .replace(/[%]/g, '\\%')
    .replace(/[_]/g, '\\_')
    .replace(/[,]/g, '%2C')
    .replace(/[(]/g, '%28')
    .replace(/[)]/g, '%29')
    .replace(/[*]/g, '%2A')
    .replace(/[`'"]/g, '');
}
