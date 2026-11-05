import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPendingInvite, savePendingInvite } from './invite';
import { invitationUrl, parseDeepLink } from './utils';

afterEach(() => vi.unstubAllGlobals());

describe('invitation handoff', () => {
  it('preserves a normalized code across page reads and clears it after joining', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    });
    savePendingInvite('ab-c123');
    expect(readPendingInvite()).toBe('ABC123');
    savePendingInvite('');
    expect(readPendingInvite()).toBe('');
  });
  it('generates a share link the onboarding parser can recognize', () => {
    vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
    const url = new URL(invitationUrl('ab-c123'));
    expect(parseDeepLink(url.search).join).toBe('ABC123');
  });
  it('keeps the current page usable if browser session storage is blocked', () => {
    vi.stubGlobal('sessionStorage', {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    });
    expect(readPendingInvite()).toBe('');
    expect(() => savePendingInvite('ABC123')).not.toThrow();
  });
});
