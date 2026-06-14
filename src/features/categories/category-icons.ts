import {
  Utensils,
  Coffee,
  Sandwich,
  Bus,
  Car,
  Fuel,
  Home,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Shirt,
  Gamepad2,
  Film,
  Receipt,
  Zap,
  Wifi,
  Phone,
  Plane,
  Gift,
  Dumbbell,
  PawPrint,
  Baby,
  Wallet,
  Banknote,
  TrendingUp,
  Briefcase,
  PiggyBank,
  Tag,
  type LucideIcon,
} from "lucide-react";

// Curated icon set for categories. Stored as the Lucide name string on the row;
// rendered via this registry (a static map — no dynamic import of all of Lucide).
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  sandwich: Sandwich,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  home: Home,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  "gamepad-2": Gamepad2,
  film: Film,
  receipt: Receipt,
  zap: Zap,
  wifi: Wifi,
  phone: Phone,
  plane: Plane,
  gift: Gift,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  baby: Baby,
  wallet: Wallet,
  banknote: Banknote,
  "trending-up": TrendingUp,
  briefcase: Briefcase,
  "piggy-bank": PiggyBank,
};

// Names offered in the icon picker, in display order.
export const ICON_NAMES: readonly string[] = Object.keys(CATEGORY_ICONS);

// Palette swatches for the color picker (warm/calm hues that pair with the theme).
export const CATEGORY_COLORS: readonly string[] = [
  "#B4423A",
  "#E07A3F",
  "#B57B14",
  "#2F855A",
  "#0E7490",
  "#2E3A59",
  "#4338CA",
  "#6D28D9",
  "#C2185B",
  "#64748B",
];

/** Resolve a stored icon name to a component, falling back to a neutral tag. */
export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Tag;
}
