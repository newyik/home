import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isAvatarValue } from './avatar';
import { demoBackend } from './demo';

describe('avatar data validation', () => {
  it('allows initials, supported icons and encoded raster images', () => {
    expect(isAvatarValue(null)).toBe(true);
    expect(isAvatarValue('emoji:🐱')).toBe(true);
    expect(isAvatarValue('data:image/webp;base64,YWJjZA==')).toBe(true);
  });
  it('rejects external URLs, SVG, unsupported presets and oversized images', () => {
    expect(isAvatarValue('https://example.test/photo.jpg')).toBe(false);
    expect(isAvatarValue('data:image/svg+xml;base64,YWJjZA==')).toBe(false);
    expect(isAvatarValue('emoji:unsupported')).toBe(false);
    expect(isAvatarValue('data:image/png;base64,' + 'a'.repeat(160000))).toBe(false);
  });
});

describe('profile avatar persistence', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('retains avatars through rename, reload and the partner view', async () => {
    const account = await demoBackend.enterDemo('me');
    const chosen = await demoBackend.updateProfile(account, undefined, 'emoji:🐱');
    expect(chosen.avatar).toBe('emoji:🐱');
    const renamed = await demoBackend.updateProfile(chosen, 'New name');
    expect(renamed.avatar).toBe('emoji:🐱');
    const restored = await demoBackend.restore();
    expect(restored?.avatar).toBe('emoji:🐱');
    const partner = await demoBackend.enterDemo('partner');
    const shared = await demoBackend.loadWorkspace(partner);
    expect(shared.members.find(member => member.id === account.userId)?.avatar).toBe('emoji:🐱');
  });
});
