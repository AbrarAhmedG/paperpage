/**
 * Transient vision-provider failures (Anthropic 529 Overloaded, rate limits,
 * 5xx) deserve a delayed retry and an honest "try again shortly" message —
 * never the "take a clearer photo" advice, which blames the user's sketch
 * for a service hiccup.
 */
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 529]);
const TRANSIENT_MESSAGE = /overloaded|rate.?limit|too many requests|\b(429|500|502|503|529)\b|timed?.?out|ECONNRESET|fetch failed/i;

export function isTransientAIError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: unknown }).status;
  if (typeof status === 'number') return TRANSIENT_STATUS.has(status);
  const message = (err as { message?: unknown }).message;
  return typeof message === 'string' && TRANSIENT_MESSAGE.test(message);
}
