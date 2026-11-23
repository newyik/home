// Mac 客户端下载提示：只在 Mac 电脑的普通浏览器里显示

export const MAC_DOWNLOAD_URL = 'https://github.com/newyik/home/releases/latest';
export const MAC_TIP_DISMISSED_KEY = 'mac-tip-dismissed';

/**
 * 判断要不要提示下载 Mac 客户端。
 * - 不是 Mac 不提示；iPad 的「桌面版网站」也自称 Mac，用触控点数排除
 * - 在 Mac 客户端里不提示：3.4 起带 LittleHomeMac 标记；
 *   更早的客户端没有标记，但它的 UA 里没有 Safari/Firefox 字样，也能认出来
 */
export function shouldOfferMacClient(userAgent: string, maxTouchPoints: number): boolean {
  if (!/Macintosh/.test(userAgent)) return false;
  if (maxTouchPoints > 1) return false;
  if (/LittleHomeMac/.test(userAgent)) return false;
  return /Safari\/|Firefox\//.test(userAgent);
}
