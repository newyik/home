import { describe, expect, it } from 'vitest';
import { shouldOfferMacClient } from './macClient';

const safari =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const chrome =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const oldShell = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('shouldOfferMacClient', () => {
  it('Mac 上的 Safari 和 Chrome 会提示', () => {
    expect(shouldOfferMacClient(safari, 0)).toBe(true);
    expect(shouldOfferMacClient(chrome, 0)).toBe(true);
  });
  it('Mac 客户端里不提示（新旧版本都是）', () => {
    expect(shouldOfferMacClient(`${oldShell} LittleHomeMac/3.4`, 0)).toBe(false);
    expect(shouldOfferMacClient(oldShell, 0)).toBe(false);
  });
  it('iPhone 和 iPad 不提示', () => {
    expect(shouldOfferMacClient(iphone, 5)).toBe(false);
    expect(shouldOfferMacClient(safari, 5)).toBe(false);
  });
});
