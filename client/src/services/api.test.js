import { describe, expect, it } from 'vitest';
import { apiMessage } from './api.js';

describe('apiMessage', () => {
  it('returns a safe backend error message', () => {
    expect(apiMessage({ response: { data: { error: { message: 'Please correct the fields.' } } } })).toBe('Please correct the fields.');
  });

  it('returns a safe fallback for network failures', () => {
    expect(apiMessage(new Error('socket details'))).toBe('We could not complete the request. Please try again.');
  });
});
