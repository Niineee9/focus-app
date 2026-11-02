import { ChevronRight, Flame, Plus } from "lucide-react";
import type { Category, CategoryStats } from "../lib/api";
import { tint, useShade } from "../lib/colors";
import { scheduleLabel } from "../lib/dates";
import { CategoryIcon } from "../lib/icons";

/** Lista de categorías para el móvil (en el PC vive en la barra lateral). */
export function HabitsView(props: {
  categories: Category[];
  stats: Map<number, CategoryStats>;
  onEdit: (c: Category | null) => void;
}) {
  const { categories, stats, onEdit } = props;
  const shade = useShade();
  return (
    <div className="flex flex-col gap-4 pb-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Hábitos</h1>
        <button
          onClick={() => onEdit(null)}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-medium text-white"
        >
          <Plus className="size-4" /> Nueva
        </button>
      </header>
      <ul className="flex flex-col gap-2">
        {categories.map((c) => {
          const s = stats.get(c.id);
          const col = shade(c.color);
          return (
            <li key={c.id}>
              <button
                onClick={() => onEdit(c)}
                className="flex w-full items-center gap-3 rounded-2xl border border-ring bg-surface p-3.5 text-left shadow-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: tint(col, 18), color: col }}>
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{c.name}</span>
                  <span className="text-xs text-muted">{scheduleLabel(c.daysMask)}</span>
                </span>
                {s && (
                  <span className={`flex items-center gap-1 text-sm font-semibold ${s.currentStreak ? "" : "text-muted"}`}>
                    <Flame className={`size-4 ${s.currentStreak ? "text-orange-500" : ""}`} />
                    {s.currentStreak}
                  </span>
                )}
                <ChevronRight className="size-4 text-muted" />
              </button>
            </li>
          );
        })}
      </ul>
      {categories.length === 0 && <p className="text-muted">Aún no tienes categorías. Crea la primera.</p>}
    </div>
  );
}
