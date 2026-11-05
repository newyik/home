import { Apple, Package, Pill, Sparkles, SprayCan, type LucideIcon } from 'lucide-react';
import { CATEGORY_MAP, type Category } from '../types';

const ICONS: Record<Category, LucideIcon> = {
  food: Apple,
  daily: Sparkles,
  clean: SprayCan,
  medicine: Pill,
  other: Package,
};

export function CategoryIcon({
  category,
  size = 18,
  className,
}: {
  category: Category;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category];
  return <Icon size={size} className={className} strokeWidth={2} />;
}

export function CategoryPill({ category }: { category: Category }) {
  const meta = CATEGORY_MAP[category];
  return (
    <span
      className="category-pill"
      style={{ color: meta.color, backgroundColor: meta.soft }}
    >
      <CategoryIcon category={category} size={12} />
      {meta.label}
    </span>
  );
}
