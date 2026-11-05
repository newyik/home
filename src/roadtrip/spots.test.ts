import { describe, expect, it } from 'vitest';
import { searchJapanSpots } from './spots';

describe('Japan spot search', () => {
  it('finds Tsunoshima and the bridge with Chinese and Japanese aliases', () => {
    const names = searchJapanSpots('角岛', 8).map((spot) => spot.name);
    expect(names).toContain('角岛');
    expect(names).toContain('角岛大桥');

    const japanese = searchJapanSpots('角島', 8).map((spot) => spot.name);
    expect(japanese).toContain('角岛');
    expect(japanese).toContain('角岛大桥');
  });

  it('finds Motonosumi Shrine and Yamaguchi spots', () => {
    const names = searchJapanSpots('元乃隅', 8).map((spot) => spot.name);
    expect(names).toContain('元乃隅神社');
    const yamaguchi = searchJapanSpots('山口县', 20).map((spot) => spot.name);
    expect(yamaguchi).toContain('角岛');
    expect(yamaguchi).toContain('秋芳洞');
  });
});
