/**
 * The one place app errors are reported from. The recovery screens call it
 * for every error they catch; error monitoring (Sentry) hooks in here.
 *
 * @param {unknown} error - what was thrown
 * @param {{ source: string }} context - which boundary caught it ('route' or 'app')
 */
export function reportError(error, { source }) {
  console.error('[reportError]', source, error);
}
