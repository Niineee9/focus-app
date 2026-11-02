import { useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { CalendarDays, ChartColumn, Flame, ListChecks, Loader2, Pencil, Plus, Settings, Sparkles } from "lucide-react";
import type { Category, ServerInfo } from "./lib/api";
import { tint, useShade } from "./lib/colors";
import { scheduleLabel } from "./lib/dates";
import { CategoryIcon } from "./lib/icons";
import { queryClient, useCategories, useStats, useStatus, useToday } from "./lib/queries";
import { CalendarView } from "./components/CalendarView";
import { CategoryDialog } from "./components/CategoryDialog";
import { HabitsView } from "./components/HabitsView";
import { Logo } from "./components/Logo";
import { SettingsView } from "./components/SettingsView";
import { Setup } from "./components/Setup";
import { StatsView } from "./components/StatsView";

type View = "calendar" | "stats" | "habits" | "settings";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  );
}

function Root() {
  const today = useToday();
  const status = useStatus(today);

  if (status.isPending) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-muted" />
        <p className="text-sm text-muted">Conectando con tu base de datos…</p>
      </main>
    );
  }
  const server = status.data?.server;
  if (!server) {
    return <Setup today={today} previousError={status.data?.error ?? (status.error ? String(status.error) : null)} />;
  }
  return <Main today={today} server={server} />;
}

function Main({ today, server }: { today: string; server: ServerInfo }) {
  const shade = useShade();
  const [view, setView] = useState<View>("calendar");
  const [filter, setFilter] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ category: Category | null } | null>(null);
  const categories = useCategories();
  const stats = useStats(today);

  const cats = categories.data ?? [];
  const statsById = useMemo(
    () => new Map((stats.data?.categories ?? []).map((s) => [s.categoryId, s])),
    [stats.data],
  );
  const error = categories.error ?? stats.error;
  const edit = (category: Category | null) => setDialog({ category });

  const nav: { id: View; label: string; icon: typeof CalendarDays; mobileOnly?: boolean }[] = [
    { id: "calendar", label: "Calendario", icon: CalendarDays },
    { id: "stats", label: "Métricas", icon: ChartColumn },
    { id: "habits", label: "Hábitos", icon: ListChecks, mobileOnly: true },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col lg:grid lg:grid-cols-[270px_1fr]">
      {/* Barra lateral (PC) */}
      <aside className="hidden flex-col gap-5 overflow-y-auto border-r border-line bg-surface px-3.5 py-5 lg:flex">
        <div className="px-1.5">
          <Logo />
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.filter((n) => !n.mobileOnly).map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium ${view === n.id ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2"}`}
            >
              <n.icon className="size-[18px]" /> {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-between px-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Categorías
          <button onClick={() => edit(null)} title="Nueva categoría" className="grid size-6 place-items-center rounded-md text-ink-2 hover:bg-surface-2">
            <Plus className="size-4" />
          </button>
        </div>

        <ul className="-mt-3 flex flex-col gap-0.5">
          <li>
            <button
              onClick={() => setFilter(null)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left font-medium ${filter === null ? "bg-accent/12" : "hover:bg-surface-2"}`}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-ink-2">
                <Sparkles className="size-4" />
              </span>
              Todas
            </button>
          </li>
          {cats.map((c) => {
            const col = shade(c.color);
            const s = statsById.get(c.id);
            return (
              <li key={c.id} className="group relative">
                <button
                  onClick={() => {
                    setFilter(filter === c.id ? null : c.id);
                    setView("calendar");
                  }}
                  style={filter === c.id ? { background: tint(col, 14) } : undefined}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-surface-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: tint(col, 20), color: col }}>
                    <CategoryIcon name={c.icon} className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="text-[11px] text-muted">{scheduleLabel(c.daysMask)}</span>
                  </span>
                  {s && (
                    <span title="Racha actual" className={`flex items-center gap-0.5 text-xs font-semibold group-hover:opacity-0 ${s.currentStreak ? "" : "text-muted"}`}>
                      <Flame className={`size-3.5 ${s.currentStreak ? "text-orange-500" : ""}`} />
                      {s.currentStreak}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => edit(c)}
                  aria-label={`Editar ${c.name}`}
                  className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md bg-surface-3 text-ink-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Pencil className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>

        {stats.data && (
          <div className="mt-auto flex flex-col gap-1.5 rounded-xl bg-surface-2 px-3.5 py-3 text-xs">
            <span className="text-muted">Hoy</span>
            <strong className="text-sm">
              {stats.data.overall.today.done} de {stats.data.overall.today.target} objetivos
            </strong>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-good transition-[width]"
                style={{
                  width: `${stats.data.overall.today.target ? (stats.data.overall.today.done / stats.data.overall.today.target) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="flex items-center gap-1 text-muted">
              Racha perfecta: <Flame className="size-3.5 text-orange-500" /> {stats.data.overall.perfectStreak}
            </span>
          </div>
        )}
      </aside>

      {/* Contenido */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-24 lg:px-6 lg:py-5">
        {error && (
          <div role="alert" className="mb-3 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
            {String(error)}
          </div>
        )}
        {view === "calendar" && <CalendarView categories={cats} today={today} filter={filter} onFilter={setFilter} />}
        {view === "stats" &&
          (stats.data ? (
            <StatsView stats={stats.data} categories={cats} onEdit={edit} />
          ) : (
            <Loader2 className="m-auto size-6 animate-spin text-muted" />
          ))}
        {view === "habits" && <HabitsView categories={cats} stats={statsById} onEdit={edit} />}
        {view === "settings" && <SettingsView server={server} />}
      </main>

      {/* Menú inferior (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${view === n.id ? "text-accent" : "text-muted"}`}
          >
            <n.icon className="size-5" />
            {n.label}
          </button>
        ))}
      </nav>

      {dialog && <CategoryDialog category={dialog.category} today={today} onClose={() => setDialog(null)} />}
    </div>
  );
}
