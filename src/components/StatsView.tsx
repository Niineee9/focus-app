import { useState } from "react";
import { Flame, Pencil } from "lucide-react";
import type { Category, DayStatus, Progress, Stats } from "../lib/api";
import { tint, useShade } from "../lib/colors";
import { longDate, pct, scheduleLabel, WEEKDAYS_LETTER } from "../lib/dates";
import { CategoryIcon } from "../lib/icons";

const STATUS_LABEL: Record<DayStatus, string> = {
  done: "Cumplido",
  missed: "No cumplido",
  pending: "Pendiente hoy",
  off: "No programado",
  extra: "Extra (día libre)",
  before: "Antes de empezar",
  future: "Próximamente",
};
const LEGEND: DayStatus[] = ["done", "extra", "missed", "pending", "off"];

interface Tip {
  x: number;
  y: number;
  text: string;
}

export function StatsView({ stats, categories, onEdit }: { stats: Stats; categories: Category[]; onEdit: (c: Category) => void }) {
  const shade = useShade();
  const [tip, setTip] = useState<Tip | null>(null);
  const o = stats.overall;

  const showTip = (e: React.SyntheticEvent<HTMLElement>, text: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.top, text });
  };
  const tipProps = (text: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showTip(e, text),
    onMouseLeave: () => setTip(null),
    onClick: (e: React.MouseEvent<HTMLElement>) => showTip(e, text),
  });

  const rows = categories
    .map((c) => ({ c, s: stats.categories.find((s) => s.categoryId === c.id) }))
    .filter((r) => r.s);

  return (
    <div className="flex flex-col gap-5 pb-6" onScroll={() => setTip(null)}>
      <h1 className="text-2xl font-bold tracking-tight lg:text-[26px]">Métricas</h1>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <Tile className="col-span-2 lg:col-span-1" label="Racha perfecta" value={
          <span className="flex items-center gap-1.5"><Flame className="size-8 text-orange-500" />{o.perfectStreak}</span>
        } sub={`${o.perfectStreak === 1 ? "día" : "días"} cumpliendo todo · mejor: ${o.bestPerfectStreak}`} big />
        <Tile label="Hoy" value={<>{o.today.done}<Small>/{o.today.target}</Small></>} sub="objetivos del día" />
        <Tile label="Esta semana" value={<>{pct(o.week.done, o.week.target)}<Small>%</Small></>} sub={`${o.week.done} de ${o.week.target} cumplidos`} />
        <Tile label="Este mes" value={<>{pct(o.month.done, o.month.target)}<Small>%</Small></>} sub={`${o.month.done} de ${o.month.target} cumplidos`} />
        <Tile label="Histórico" value={<>{Math.round(o.completionRate * 100)}<Small>%</Small></>} sub="de los días programados" />
      </section>

      <section className="grid gap-3.5 xl:grid-cols-2">
        {rows.map(({ c, s }) => {
          const col = shade(c.color);
          const st = s!;
          const weeks = Array.from({ length: st.history.length / 7 }, (_, i) => st.history.slice(i * 7, i * 7 + 7));
          return (
            <article key={c.id} className="flex flex-col gap-4 rounded-2xl border border-ring bg-surface p-4 shadow-sm lg:p-5">
              <header className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl" style={{ background: tint(col, 18), color: col }}>
                  <CategoryIcon name={c.icon} className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate font-semibold">{c.name}</h3>
                  <span className="text-xs text-muted">{scheduleLabel(c.daysMask)}</span>
                </div>
                <button onClick={() => onEdit(c)} aria-label={`Editar ${c.name}`} className="grid size-9 place-items-center rounded-lg border border-line bg-surface-2 text-ink-2">
                  <Pencil className="size-4" />
                </button>
              </header>

              <div className="grid grid-cols-4 gap-2">
                <Num value={st.currentStreak} label="racha actual" />
                <Num value={st.bestStreak} label="mejor racha" />
                <Num value={`${Math.round(st.completionRate * 100)}%`} label="cumplimiento" />
                <Num value={st.completedScheduled + st.extraCompletions} label={st.extraCompletions ? `total (${st.extraCompletions} extra)` : "total"} />
              </div>

              <div className="flex flex-col gap-2">
                <Bar label="Semana" p={st.week} color={col} tipProps={tipProps} />
                <Bar label="Mes" p={st.month} color={col} tipProps={tipProps} />
              </div>

              <div className="flex gap-1.5 overflow-x-auto">
                <div className="grid shrink-0 grid-rows-[repeat(7,14px)] gap-[3px] text-[10px] leading-[14px] text-muted">
                  {WEEKDAYS_LETTER.map((l, i) => <span key={l} className={i % 2 ? "invisible" : ""}>{l}</span>)}
                </div>
                <div className="flex flex-1 gap-[3px]">
                  {weeks.map((week, i) => (
                    <div key={i} className="grid min-w-[10px] max-w-[18px] flex-1 grid-rows-[repeat(7,14px)] gap-[3px]">
                      {week.map((d) => (
                        <span
                          key={d.date}
                          role="img"
                          aria-label={`${longDate(d.date)}: ${STATUS_LABEL[d.status]}`}
                          className={`rounded-[3px] ${d.date === stats.today ? "outline-[1.5px] outline-offset-1 outline-ink-2 outline" : ""}`}
                          style={squareStyle(d.status, col)}
                          {...tipProps(`${longDate(d.date)} — ${STATUS_LABEL[d.status]}`)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <footer className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                {LEGEND.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <i className="size-2.5 rounded-[3px]" style={squareStyle(s, col)} />
                    {STATUS_LABEL[s]}
                  </span>
                ))}
              </footer>
            </article>
          );
        })}
        {rows.length === 0 && <p className="text-muted">Crea tu primera categoría para ver métricas.</p>}
      </section>

      {tip && (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-surface"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}

function squareStyle(status: DayStatus, color: string): React.CSSProperties {
  switch (status) {
    case "done":
      return { background: color };
    case "extra":
      return { background: tint(color, 45) };
    case "missed":
      return { background: tint("var(--color-critical)", 30) };
    case "pending":
      return { boxShadow: `inset 0 0 0 2px ${color}` };
    case "off":
      return { background: "var(--color-surface-2)", opacity: 0.6 };
    default:
      return { boxShadow: "inset 0 0 0 1px var(--color-line)" };
  }
}

function Tile(props: { label: string; value: React.ReactNode; sub: string; big?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-2xl border border-ring bg-surface px-4 py-3.5 shadow-sm ${props.className ?? ""}`}>
      <span className="text-xs font-semibold text-ink-2">{props.label}</span>
      <span className={`font-bold tracking-tight ${props.big ? "text-4xl" : "text-3xl"}`}>{props.value}</span>
      <span className="text-xs text-muted">{props.sub}</span>
    </div>
  );
}

const Small = ({ children }: { children: React.ReactNode }) => (
  <small className="text-base font-semibold text-muted">{children}</small>
);

function Num({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-xl font-bold lg:text-[22px]">{value}</span>
      <span className="text-[11px] leading-tight text-muted lg:text-xs">{label}</span>
    </div>
  );
}

function Bar(props: {
  label: string;
  p: Progress;
  color: string;
  tipProps: (text: string) => object;
}) {
  const { label, p, color, tipProps } = props;
  return (
    <div className="grid grid-cols-[52px_1fr_44px] items-center gap-2.5 text-xs">
      <span className="text-ink-2">{label}</span>
      <div
        role="img"
        aria-label={`${label}: ${p.done} de ${p.target}`}
        className="h-2.5 overflow-hidden rounded-full bg-surface-3 py-0.5"
        {...tipProps(`${label}: ${p.done} de ${p.target} días objetivo`)}
      >
        <div className="h-1.5 rounded-r transition-[width] duration-300" style={{ width: `${pct(p.done, p.target)}%`, background: color }} />
      </div>
      <span className="text-right text-ink-2 tabular-nums">{p.done}/{p.target}</span>
    </div>
  );
}
