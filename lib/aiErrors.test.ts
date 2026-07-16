import { describe, it, expect } from 'vitest';
import { isTransientAIError } from './aiErrors';

describe('isTransientAIError', () => {
  it('recognizes Anthropic overloaded / rate-limit / server errors by status', () => {
    expect(isTransientAIError({ status: 529 })).toBe(true);
    expect(isTransientAIError({ status: 429 })).toBe(true);
    expect(isTransientAIError({ status: 500 })).toBe(true);
    expect(isTransientAIError({ status: 503 })).toBe(true);
  });

  it('recognizes overload by message when no status is present', () => {
    expect(isTransientAIError(new Error('529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}'))).toBe(true);
    expect(isTransientAIError(new Error('rate limit exceeded'))).toBe(true);
  });

  it('does not treat auth/config/validation failures as transient', () => {
    expect(isTransientAIError({ status: 401 })).toBe(false);
    expect(isTransientAIError({ status: 400 })).toBe(false);
    expect(isTransientAIError(new Error('sections.0.role: invalid enum value'))).toBe(false);
    expect(isTransientAIError(undefined)).toBe(false);
  });
});
