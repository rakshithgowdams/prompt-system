/**
 * Escape a user-supplied string for safe use inside a PostgREST .or() / .ilike() filter.
 *
 * PostgREST uses % as LIKE wildcards (wrapping happens at the call site).
 * Literal % in user input must be percent-encoded as %25 so PostgREST doesn't
 * treat them as wildcards. Other PostgREST metacharacters are percent-encoded too.
 * SQL _ wildcard is backslash-escaped (PostgREST passes it through to SQL).
 */
export function escapePostgrestLike(value: string): string {
  return value
    .trim()
    .slice(0, 100)          // cap length — searches >100 chars are abuse
    .replace(/%/g, '%25')  // literal % → %25 (NOT a SQL wildcard)
    .replace(/_/g, '\\_')  // SQL single-char wildcard
    .replace(/,/g, '%2C')  // PostgREST .or() arg separator
    .replace(/\(/g, '%28') // PostgREST grouping
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A') // PostgREST glob char
    .replace(/[`'"]/g, ''); // strip quotes
}
