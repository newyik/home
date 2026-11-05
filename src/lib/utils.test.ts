import { describe, expect, it } from 'vitest';
import type { Item } from '../types';
import {
  countThisWeek,
  formatInviteCode,
  formatRelativeTime,
  guessCategory,
  normalizeInviteCode,
  parseDeepLink,
  quantityLabel,
  sortItems,
} from './utils';

function item(overrides: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    id: overrides.id,
    name: '牛奶',
    quantity: '1',
    note: null,
    category: 'food',
    done: false,
    createdBy: 'u1',
    createdByName: '小雨',
    completedByName: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    completedAt: null,
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('invite codes', () => {
  it('normalizes to six uppercase characters', () => {
    expect(normalizeInviteCode('ab-c 12!3')).toBe('ABC123');
    expect(normalizeInviteCode('  h8m2k6  ')).toBe('H8M2K6');
  });

  it('formats into two readable groups', () => {
    expect(formatInviteCode('abc123')).toBe('ABC 123');
    expect(formatInviteCode('ABC')).toBe('ABC');
  });
});

describe('category guessing', () => {
  it('recognizes home categories', () => {
    expect(guessCategory('洗衣液')).toBe('clean');
    expect(guessCategory('洗发水')).toBe('daily');
    expect(guessCategory('牛奶')).toBe('food');
    expect(guessCategory('维生素 C')).toBe('medicine');
    expect(guessCategory('垃圾袋')).toBe('daily');
    expect(guessCategory('纸巾')).toBe('daily');
    expect(guessCategory('酱油')).toBe('food');
    expect(guessCategory('狗粮')).toBe('other');
  });
});

describe('deep links', () => {
  it('reads add, quick, join and demo parameters', () => {
    const link = parseDeepLink(
      '?add=%E7%89%9B%E5%A5%B6&quick=1&join=abc-123&demo=1',
    );
    expect(link).toEqual({ add: '牛奶', quick: true, join: 'ABC123', demo: true });
  });

  it('ignores incomplete join codes and sanitizes add text', () => {
    expect(parseDeepLink('?join=ABC')).toEqual({});
    expect(parseDeepLink('?add=%00%E7%89%9B%E5%A5%B6%0A')).toEqual({ add: '牛奶' });
  });

  it('caps very long names', () => {
    expect(parseDeepLink(`?add=${'a'.repeat(200)}`).add).toHaveLength(80);
  });
});

describe('list helpers', () => {
  it('puts pending items first and latest pending on top', () => {
    const result = sortItems([
      item({ id: 'done-old', done: true, completedAt: '2026-01-10T10:00:00.000Z' }),
      item({ id: 'pending-old', createdAt: '2026-01-10T10:00:00.000Z' }),
      item({ id: 'pending-new', createdAt: '2026-01-12T10:00:00.000Z' }),
      item({ id: 'done-new', done: true, completedAt: '2026-01-14T10:00:00.000Z' }),
    ]);
    expect(result.map((entry) => entry.id)).toEqual([
      'pending-new',
      'pending-old',
      'done-new',
      'done-old',
    ]);
  });

  it('counts completions since Monday', () => {
    const now = new Date(2026, 0, 14, 12, 0, 0); // Wednesday
    const items = [
      item({ id: 'monday', done: true, completedAt: new Date(2026, 0, 12, 9).toISOString() }),
      item({ id: 'sunday', done: true, completedAt: new Date(2026, 0, 11, 9).toISOString() }),
      item({ id: 'pending' }),
    ];
    expect(countThisWeek(items, now)).toBe(1);
  });

  it('hides a default quantity', () => {
    expect(quantityLabel('1')).toBe('');
    expect(quantityLabel('2 瓶')).toBe('2 瓶');
    expect(quantityLabel(' ')).toBe('');
  });
});

describe('relative time', () => {
  const now = new Date(2026, 0, 15, 12, 0, 0);

  it('describes recent times in Chinese', () => {
    expect(formatRelativeTime(new Date(2026, 0, 15, 11, 58), now)).toBe('2 分钟前');
    expect(formatRelativeTime(new Date(2026, 0,15, 9, 30), now)).toBe('今天 09:30');
    expect(formatRelativeTime(new Date(2026, 0, 14, 20, 5), now)).toBe('昨天 20:05');
    expect(formatRelativeTime(new Date(2026, 0, 12, 9, 0), now)).toBe('3 天前');
    expect(formatRelativeTime(new Date(2026, 0, 1, 9, 0), now)).toBe('1月1日');
  });
});
