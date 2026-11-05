import {
  CATEGORY_MAP,
  DEFAULT_CATEGORY,
  type Category,
  type DeepLink,
  type Item,
} from '../types';

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function normalizeInviteCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function formatInviteCode(code: string): string {
  const clean = normalizeInviteCode(code);
  return clean.length > 3 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
}

export function guessCategory(name: string): Category {
  const value = name.toLowerCase();

  const medicine = ['药', '维c', '维生素', '创可贴', '口罩', '体温计', '退烧', '感冒'];
  if (medicine.some((word) => value.includes(word))) return 'medicine';

  const clean = [
    '洗衣',
    '洗洁',
    '消毒',
    '清洁',
    '洁厕',
    '除菌',
    '柔顺剂',
    '拖把',
    '扫把',
    '抹布',
    '洗地',
    '去污',
    '漂白',
  ];
  if (clean.some((word) => value.includes(word))) return 'clean';

  const daily = [
    '纸巾',
    '卫生纸',
    '抽纸',
    '洗发水',
    '护发素',
    '沐浴露',
    '牙膏',
    '牙刷',
    '毛巾',
    '垃圾袋',
    '保鲜膜',
    '保鲜袋',
    '电池',
    '灯泡',
    '拖鞋',
    '袜子',
    '内衣',
    '洗面奶',
    '护肤品',
    '防晒',
    '棉签',
    '衣架',
    '水杯',
  ];
  if (daily.some((word) => value.includes(word))) return 'daily';

  const food = [
    '牛奶',
    '酸奶',
    '鸡蛋',
    '面包',
    '大米',
    '小米',
    '米饭',
    '面条',
    '面粉',
    '食用油',
    '花生油',
    '橄榄油',
    '酱油',
    '醋',
    '盐',
    '糖',
    '水果',
    '苹果',
    '香蕉',
    '橙',
    '牛肉',
    '猪肉',
    '鸡肉',
    '羊肉',
    '火腿',
    '培根',
    '白菜',
    '青菜',
    '蔬菜',
    '生菜',
    '菠菜',
    '西兰花',
    '土豆',
    '番茄',
    '西红柿',
    '零食',
    '咖啡',
    '茶叶',
    '红茶',
    '绿茶',
    '饮料',
    '矿泉水',
    '气泡水',
    '豆腐',
    '饺子',
    '速冻',
    '早餐',
    '麦片',
    '黄油',
    '芝士',
  ];
  if (food.some((word) => value.includes(word))) return 'food';

  return DEFAULT_CATEGORY;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeFormatter(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatRelativeTime(input: string | Date, now = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';

  const diff = now.getTime() - date.getTime();
  if (diff < 45_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;

  if (isSameDay(date, now)) return `今天 ${timeFormatter(date)}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `昨天 ${timeFormatter(date)}`;

  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days} 天前`;

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 13) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    if (a.done && b.done) {
      return new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function countThisWeek(items: Item[], now = new Date()): number {
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return items.filter((item) => {
    if (!item.done || !item.completedAt) return false;
    return new Date(item.completedAt).getTime() >= start.getTime();
  }).length;
}

export function quantityLabel(quantity: string): string {
  const value = quantity.trim();
  if (!value || value === '1') return '';
  return value;
}

export function parseDeepLink(search: string): DeepLink {
  const params = new URLSearchParams(search);
  const link: DeepLink = {};

  const add = (params.get('add') ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  if (add) link.add = add;

  if (params.get('quick') === '1' || params.get('quick') === 'true') link.quick = true;

  const join = normalizeInviteCode(params.get('join') ?? '');
  if (join.length === 6) link.join = join;

  if (params.get('demo') === '1') link.demo = true;

  return link;
}

export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

export function shortcutAddUrl(sample = '牛奶'): string {
  return `${appUrl()}?add=${encodeURIComponent(sample)}&quick=1#/shopping`;
}

export function categoryLabel(category: Category): string {
  return CATEGORY_MAP[category].label;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function friendlyAuthError(message: string): string {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) return '邮箱或密码不对，再试一次。';
  if (value.includes('email not confirmed')) return '邮箱还没验证，先去收件箱点一下确认链接。';
  if (value.includes('user already registered')) return '这个邮箱已经注册过了，直接登录吧。';
  if (value.includes('password should be at least')) return '密码至少需要 6 位。';
  if (value.includes('rate limit') || value.includes('too many')) return '操作太频繁啦，等一会儿再试。';
  if (value.includes('unable to validate email')) return '邮箱格式好像不对。';
  if (value.includes('network') || value.includes('fetch')) return '网络连不上，检查一下网络再试。';
  return message;
}

export function friendlyWorkspaceError(message: string): string {
  if (message.includes('already_in_household')) return '你已经在另一个小家里了。';
  if (message.includes('invalid_code')) return '邀请码不对，再核对一下。';
  if (message.includes('not authenticated')) return '登录状态过期了，请重新登录。';
  return message;
}
