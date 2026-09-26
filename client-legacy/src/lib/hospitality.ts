import {
  Armchair,
  ChefHat,
  Zap,
  Users,
  Truck,
  Building2,
  Hotel,
  Package,
  Cpu,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export const photo = (id: string, width = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&q=80&auto=format&fit=crop`;

export const HERO_IMAGE = photo('1542314831-068cd1dbfeeb', 1800);
export const CTA_IMAGE = photo('1571003123894-1f0594d2b5d9', 1200);

const CATEGORY_IMAGES: Record<string, string> = {
  Furniture: '1617806118233-18e1de247200',
  'Catering & Kitchen': '1600565193348-f74bd3c7ccdf',
  'Event Infrastructure': '1470229722913-7c0e2dbbafd3',
  Manpower: '1581299894007-aaa50297cf16',
  Transportation: '1601584115197-04ecc0da31d7',
  'Venues & Spaces': '1464366400600-7168b8af9bc3',
  Accommodation: '1611892440504-42a792e24d32',
  'Hospitality Supplies': '1631049307264-da0ec9d70304',
  Technology: '1556742049-0cfed4f6a45d',
  Services: '1581578731548-c64695cc6952',
};

export const categoryImage = (name: string, width = 400) =>
  photo(CATEGORY_IMAGES[name] ?? '1566073771259-6a8506099945', width);

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Chair: Armchair,
  ChefHat,
  Zap,
  Users,
  Truck,
  Building2,
  Hotel,
  Package,
  Cpu,
  Wrench,
};

export const categoryIcon = (icon: string): LucideIcon => CATEGORY_ICONS[icon] ?? Package;

export function formatINRCompact(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)}Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  if (amount >= 1e3) return `₹${(amount / 1e3).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
}

export const formatINR = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export const formatUnit = (unit: string) => unit.replace(/^per /, '').replace(/ per /g, ' / ');

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
