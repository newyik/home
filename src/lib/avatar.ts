export const AVATAR_CHOICES = [
  { value: 'emoji:🐱', label: '小猫' },
  { value: 'emoji:🐶', label: '小狗' },
  { value: 'emoji:🐰', label: '小兔' },
  { value: 'emoji:🐼', label: '熊猫' },
  { value: 'emoji:🦊', label: '小狐狸' },
  { value: 'emoji:🌷', label: '郁金香' },
];

export function isAvatarValue(value: string | null): boolean {
  return value === null || AVATAR_CHOICES.some(choice => choice.value === value) ||
    (value.length <= 160000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value));
}

export async function photoAvatar(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('请选择 JPG、PNG 或 WebP 图片。');
  }
  if (file.size > 8 * 1024 * 1024) throw new Error('图片需要小于 8 MB。');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('图片没能打开，请换一张试试。'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器暂时无法处理图片。');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error('图片尺寸无效。');
    for (const size of [256, 192, 128]) {
      canvas.width = size;
      canvas.height = size;
      context.drawImage(image,
        (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side,
        0, 0, size, size);
      const value = canvas.toDataURL('image/webp', .82);
      if (isAvatarValue(value)) return value;
    }
    throw new Error('图片处理后仍然太大，请换一张简单一些的图片。');
  } finally {
    URL.revokeObjectURL(url);
  }
}
