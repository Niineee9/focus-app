import {
  Activity, Apple, BedDouble, Bike, BookOpen, Brain, CigaretteOff, Circle, Code, Coffee,
  Droplet, Dumbbell, Flame, Footprints, GraduationCap, Guitar, HandHeart, Heart, Hourglass,
  Languages, Leaf, Moon, Music, PenLine, Pill, Salad, Smile, Sparkles, Star, Sun, Target,
  Timer, Utensils, Wallet, type LucideIcon, type LucideProps,
} from "lucide-react";

/** Iconos disponibles para las categorías (se guarda el nombre en la base de datos). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Dumbbell, Footprints, Bike, Activity, Salad, Utensils, Apple, Droplet, Coffee,
  Languages, BookOpen, GraduationCap, PenLine, Brain, Code, Music, Guitar,
  Moon, BedDouble, Sun, Heart, HandHeart, Pill, Smile, Leaf, CigaretteOff,
  Wallet, Timer, Hourglass, Target, Flame, Sparkles, Star,
};

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = CATEGORY_ICONS[name] ?? Circle;
  return <Icon {...props} />;
}
