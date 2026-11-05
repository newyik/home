import { describe, expect, it } from 'vitest';
import { searchAdminPlaces } from './adminPlaces';

describe('prefecture and city search', () => {
  it('finds every prefecture by Chinese and Japanese names', () => {
    expect(searchAdminPlaces('山口县').some((place) => place.kind === 'prefecture' && place.name === '山口县')).toBe(true);
    expect(searchAdminPlaces('山口県').some((place) => place.kind === 'prefecture' && place.name === '山口县')).toBe(true);
    expect(searchAdminPlaces('北海道').some((place) => place.kind === 'prefecture' && place.name === '北海道')).toBe(true);
  });

  it('finds capitals and major municipalities', () => {
    expect(searchAdminPlaces('山口市').some((place) => place.name === '山口市' && place.kind === 'city')).toBe(true);
    expect(searchAdminPlaces('下关').some((place) => place.name === '下关市')).toBe(true);
    expect(searchAdminPlaces('札幌').some((place) => place.name === '札幌市')).toBe(true);
    expect(searchAdminPlaces('萩市').some((place) => place.name === '萩市')).toBe(true);
  });
});
