import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Category } from "../lib/api";
import { tint, useShade } from "../lib/colors";
import { fromISO, isScheduled, longDate, monthGrid, MONTHS, WEEKDAYS_LETTER, WEEKDAYS_SHORT } from "../lib/dates";
import { CategoryIcon } from "../lib/icons";
import { useCompletions, useToggle } from "../lib/queries";

type ChipState = "done" | "extra" | "pending" | "missed" | "future" | "open";

const LABEL: Record<ChipState, string> = {
  done: "cumplido",
  extra: "cumplido (extra)",
  pending: "pendiente hoy",
  missed: "no cumplido",
  future: "programado",
  open: "sin registrar",
};

interface Props {
  categories: Category[];
  today: string;
  filter: number | null;
  onFilter: (id: number | null) => void;
}

export function CalendarView({ categories, today, filter, onFilter }: Props) {
  const shade = useShade();
  const [cursor, setCursor] = useState(() => {
    const d = fromISO(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const { data: completions = [] } = useCompletions(grid[0], grid[41]);
  const toggle = useToggle(today);

  const done = useMemo(() => new Set(completions.map((c) => `${c.categoryId}|${c.date}`)), [completions]);
  const isDone = (id: number, date: string) => done.has(`${id}|${date}`);
  const focused = categories.find((c) => c.id === filter) ?? null;

  function chipState(c: Category, date: string): ChipState {
    if (isDone(c.id, date)) return isScheduled(c.daysMask, date) ? "done" : "extra";
    if (date > today) return "future";
    if (date === today) return "pending";
    // Antes de crear la categoría no es un fallo: se puede registrar a posteriori.
    return date < c.createdAt ? "open" : "missed";
  }

  function isPerfect(date: string) {
    if (date > today) return false;
    const due = categories.filter((c) => isScheduled(c.daysMask, date) && c.createdAt <= date);
    return due.length > 0 && due.every((c) => isDone(c.id, date));
  }

  const flip = (categoryId: number, date: string) => {
    if (date <= today) toggle.mutate({ categoryId, date });
  };

  function shiftMonth(delta: number) {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  function goToday() {
    const d = fromISO(today);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  }

  function cellClick(date: string) {
    setSelected(date);
    if (focused) flip(focused.id, date);
  }

  // Categorías del día seleccionado: primero las que tocan.
  const dayCategories = [...categories].sort(
    (a, b) => Number(isScheduled(b.daysMask, selected)) - Number(isScheduled(a.daysMask, selected)),
  );

  return (
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:gap-4">
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight lg:text-[26px]">
          <span className="capitalize">{MONTHS[cursor.month]}</span>{" "}
          <span className="font-medium text-muted">{cursor.year}</span>
        </h1>
        <span className="flex-1" />
        <button onClick={goToday} className="h-9 rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium hover:bg-surface-3">
          Hoy
        </button>
        <button onClick={() => shiftMonth(-1)} aria-label="Mes anterior" className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 hover:bg-surface-3">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={() => shiftMonth(1)} aria-label="Mes siguiente" className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 hover:bg-surface-3">
          <ChevronRight className="size-4" />
        </button>
      </header>

      {/* Filtro por categoría en el móvil (en el PC está en la barra lateral). */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        <FilterChip active={filter === null} onClick={() => onFilter(null)} label="Todas" />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            color={shade(c.color)}
            onClick={() => onFilter(filter === c.id ? null : c.id)}
            label={c.name}
            icon={c.icon}
          />
        ))}
      </div>

      {/* En el PC todo cabe en la ventana; en el móvil la página hace scroll. */}
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col lg:min-h-0">
          <div className="mb-1.5 grid grid-cols-7 gap-1 lg:gap-1.5">
            {WEEKDAYS_SHORT.map((d, i) => (
              <span key={d} className="text-center text-[11px] font-semibold tracking-wider text-muted uppercase lg:pl-2.5 lg:text-left">
                <span className="lg:hidden">{WEEKDAYS_LETTER[i]}</span>
                <span className="hidden lg:inline">{d}</span>
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 lg:min-h-0 lg:flex-1 lg:grid-rows-6 lg:gap-1.5">
            {grid.map((date) => {
              const inMonth = fromISO(date).getMonth() === cursor.month;
              const future = date > today;
              const perfect = inMonth && !focused && isPerfect(date);
              const visible = categories.filter((c) => isScheduled(c.daysMask, date) || isDone(c.id, date));
              return (
                <div
                  key={date}
                  role="button"
                  tabIndex={0}
                  onClick={() => cellClick(date)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && cellClick(date)}
                  className={[
                    "relative flex aspect-square cursor-pointer flex-col gap-1 overflow-hidden rounded-lg border p-1 transition-colors lg:aspect-auto lg:gap-1.5 lg:rounded-xl lg:p-2",
                    date === selected ? "border-accent ring-1 ring-accent" : "border-ring hover:border-line-strong",
                    !inMonth && "opacity-35",
                    future ? "bg-transparent" : perfect ? "bg-good/8" : "bg-surface",
                  ].filter(Boolean).join(" ")}
                >
                  <span
                    className={[
                      "grid size-5 place-items-center rounded-full text-[11px] font-semibold lg:size-6 lg:text-[13px]",
                      date === today ? "bg-accent text-white" : "text-ink-2",
                    ].join(" ")}
                  >
                    {fromISO(date).getDate()}
                  </span>
                  {perfect && (
                    <span title="Día perfecto: todo cumplido" className="absolute top-1 right-1.5 text-[10px] font-bold text-good-text lg:top-2 lg:right-2.5 lg:text-xs">
                      ✓
                    </span>
                  )}

                  {!inMonth ? null : focused ? (
                    <FocusMark category={focused} date={date} state={chipState(focused, date)} color={shade(focused.color)} />
                  ) : (
                    <>
                      {/* PC: fichas con icono que se pueden pulsar. */}
                      <div className="hidden flex-wrap gap-1.5 lg:flex">
                        {visible.map((c) => (
                          <Chip
                            key={c.id}
                            category={c}
                            state={chipState(c, date)}
                            color={shade(c.color)}
                            disabled={future}
                            onClick={() => {
                              setSelected(date);
                              flip(c.id, date);
                            }}
                          />
                        ))}
                      </div>
                      {/* Móvil: puntos de color; se marca desde el panel del día. */}
                      <div className="mt-auto flex flex-wrap justify-center gap-0.5 pb-0.5 lg:hidden">
                        {visible.map((c) => (
                          <Dot key={c.id} state={chipState(c, date)} color={shade(c.color)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border border-ring bg-surface p-4 shadow-sm lg:overflow-y-auto">
          <h2 className="font-semibold first-letter:uppercase">{longDate(selected)}</h2>
          {selected > today && <p className="text-sm text-muted">Día futuro: podrás marcarlo cuando llegue.</p>}
          <ul className="flex flex-col gap-1.5">
            {dayCategories.map((c) => {
              const checked = isDone(c.id, selected);
              const sched = isScheduled(c.daysMask, selected);
              const color = shade(c.color);
              return (
                <li key={c.id}>
                  <button
                    disabled={selected > today}
                    onClick={() => flip(c.id, selected)}
                    style={{ borderColor: checked ? tint(color, 50) : undefined, background: checked ? tint(color, 12) : undefined }}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition-colors disabled:opacity-50",
                      !sched && !checked && "border-dashed",
                    ].filter(Boolean).join(" ")}
                  >
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-md border-2"
                      style={{ borderColor: color, background: checked ? color : undefined }}
                    >
                      {checked && <X className="size-4 text-white" strokeWidth={3.2} />}
                    </span>
                    <CategoryIcon name={c.icon} className="size-5 shrink-0" style={{ color }} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="text-xs text-muted">{sched ? "Objetivo del día" : "Día libre · cuenta como extra"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {categories.length === 0 && <li className="text-sm text-muted">Aún no tienes categorías.</li>}
          </ul>
          <p className="mt-auto pt-2 text-xs text-muted">
            {focused
              ? `Con «${focused.name}» seleccionada, toca cualquier día para marcarlo.`
              : "Toca un día y márcalo aquí con una ✕."}
          </p>
        </aside>
      </div>
    </div>
  );
}

function FilterChip(props: { active: boolean; label: string; onClick: () => void; color?: string; icon?: string }) {
  const { active, label, onClick, color, icon } = props;
  return (
    <button
      onClick={onClick}
      style={active && color ? { background: tint(color, 16), borderColor: tint(color, 45) } : undefined}
      className={[
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
        active ? (color ? "" : "border-accent bg-accent/10") : "border-line bg-surface",
      ].join(" ")}
    >
      {icon && <CategoryIcon name={icon} className="size-4" style={{ color }} />}
      {label}
    </button>
  );
}

function Chip(props: { category: Category; state: ChipState; color: string; disabled: boolean; onClick: () => void }) {
  const { category: c, state, color, disabled, onClick } = props;
  const filled = state === "done" || state === "extra";
  const style: React.CSSProperties =
    state === "done"
      ? { background: color, borderColor: color }
      : state === "extra"
        ? { background: tint(color, 60), borderColor: "transparent" }
        : state === "missed"
          ? { borderStyle: "dashed", borderColor: "var(--color-critical)" }
          : state === "pending"
            ? { background: tint(color, 22), borderColor: color, borderWidth: 2 }
            : state === "future"
              ? { background: tint(color, 7), borderColor: "transparent" }
              : { background: tint(color, 14), borderColor: tint(color, 35) };
  return (
    <button
      title={`${c.name}: ${LABEL[state]}`}
      aria-label={`${c.name}: ${LABEL[state]}`}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={style}
      className="grid size-[34px] place-items-center rounded-[10px] border-[1.5px] transition-transform enabled:hover:scale-110"
    >
      {filled ? (
        <X className="size-5 text-white" strokeWidth={3} />
      ) : (
        <CategoryIcon
          name={c.icon}
          className={state === "missed" ? "size-[18px] opacity-40 grayscale" : state === "future" ? "size-[18px] opacity-45" : "size-[18px]"}
          style={{ color: state === "missed" ? "var(--color-muted)" : color }}
        />
      )}
    </button>
  );
}

function Dot({ state, color }: { state: ChipState; color: string }) {
  const style: React.CSSProperties =
    state === "done"
      ? { background: color }
      : state === "extra"
        ? { background: tint(color, 55) }
        : state === "missed"
          ? { boxShadow: "inset 0 0 0 1.5px var(--color-critical)", opacity: 0.6 }
          : state === "pending"
            ? { boxShadow: `inset 0 0 0 2px ${color}` }
            : { boxShadow: `inset 0 0 0 1.5px ${tint(color, 40)}` };
  return <span className="size-2 rounded-full" style={style} />;
}

function FocusMark(props: { category: Category; date: string; state: ChipState; color: string }) {
  const { category, date, state, color } = props;
  const scheduled = isScheduled(category.daysMask, date);
  if (state === "done" || state === "extra") {
    return (
      <svg viewBox="0 0 100 100" aria-label="Cumplido" className={`absolute inset-[18%_14%_6%] h-[76%] w-[72%] ${state === "extra" ? "opacity-50" : ""}`}>
        <path d="M24 24 L76 76 M76 24 L24 76" stroke={color} strokeWidth={11} strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (!scheduled) return <span className="m-auto hidden text-[11px] text-muted lg:block">descanso</span>;
  if (state === "missed") return <span title="No cumplido" className="m-auto size-2.5 rounded-full bg-critical/70" />;
  return (
    <span
      title={LABEL[state]}
      className="m-auto size-5 rounded-full border-2 border-dashed opacity-60 lg:size-[26px]"
      style={{ borderColor: color }}
    />
  );
}
