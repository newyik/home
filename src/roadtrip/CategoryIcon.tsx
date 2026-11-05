import {
  Bath,
  Building2,
  FerrisWheel,
  Landmark,
  MapPin,
  Mountain,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { ROADTRIP_CATEGORY_MAP, type RoadtripCategory } from './types';

const ICONS: Record<RoadtripCategory, LucideIcon> = {
  nature: Mountain,
  onsen: Bath,
  city: Building2,
  food: Utensils,
  shrine: Landmark,
  park: FerrisWheel,
  other: MapPin,
};

export function RoadtripCategoryIcon({
  category,
  size = 17,
  className,
}: {
  category: RoadtripCategory;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category];
  return <Icon size={size} className={className} strokeWidth={2} />;
}

export function RoadtripCategoryPill({ category }: { category: RoadtripCategory }) {
  const meta = ROADTRIP_CATEGORY_MAP[category];
  return (
    <span
      className="rt-category-pill"
      style={{ color: meta.color, backgroundColor: meta.soft }}
    >
      <RoadtripCategoryIcon category={category} size={12} />
      {meta.label}
    </span>
  );
}
