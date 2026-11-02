import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import type { Category } from "../lib/api";
import { PALETTE, tint, useShade } from "../lib/colors";
import { ALL_DAYS, WEEKDAYS, WEEKDAYS_SHORT, WEEKEND } from "../lib/dates";
import { CATEGORY_ICONS, CategoryIcon } from "../lib/icons";
import { useDeleteCategory, useSaveCategory } from "../lib/queries";

const PRESETS = [
  { label: "Todos", mask: ALL_DAYS },
  { label: "Lun–Vie", mask: WEEKDAYS },
  { label: "Fin de semana", mask: WEEKEND },
];

interface Props {
  /** `null` para crear una categoría nueva. */
  category: Category | null;
  today: string;
  onClose: () => void;
}

export function CategoryDialog({ category, today, onClose }: Props) {
  const shade = useShade();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "Dumbbell");
  const [color, setColor] = useState(category?.color ?? PALETTE[0].light);
  const [daysMask, setDaysMask] = useState(category?.daysMask ?? ALL_DAYS);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const save = useSaveCategory(today);
  const remove = useDeleteCategory();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Ponle un nombre");
    if (!daysMask) return setError("Elige al menos un día");
    save.mutate(
      { id: category?.id ?? null, input: { name: name.trim(), icon, color, daysMask } },
      { onSuccess: onClose, onError: (err) => setError(String(err)) },
    );
  }

  const c = shade(color);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        aria-label={category ? "Editar categoría" : "Nueva categoría"}
        className="flex max-h-[92dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-3xl border border-ring bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-2xl sm:pb-5"
      >
        <header className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: c }}>
            <CategoryIcon name={icon} className="size-5" />
          </span>
          <h2 className="text-lg font-semibold">{category ? "Editar categoría" : "Nueva categoría"}</h2>
        </header>

        <label className="flex flex-col gap-2">
          <FieldLabel>Nombre</FieldLabel>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Meditación"
            maxLength={40}
            autoFocus={!category}
            className="h-11 rounded-xl border border-line-strong bg-surface-2 px-3 outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col gap-2">
          <FieldLabel>Icono</FieldLabel>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.keys(CATEGORY_ICONS).map((n) => (
              <button
                key={n}
                type="button"
                title={n}
                onClick={() => setIcon(n)}
                style={icon === n ? { background: tint(c, 18), borderColor: c, color: c } : undefined}
                className="grid aspect-square place-items-center rounded-lg border border-transparent bg-surface-2 text-ink-2"
              >
                <CategoryIcon name={n} className="size-[18px]" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Color</FieldLabel>
          <div className="flex flex-wrap gap-2.5">
            {PALETTE.map((p) => {
              const sw = shade(p.light);
              return (
                <button
                  key={p.light}
                  type="button"
                  title={p.name}
                  aria-label={p.name}
                  onClick={() => setColor(p.light)}
                  className="size-8 rounded-full"
                  style={{
                    background: sw,
                    boxShadow:
                      color === p.light
                        ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${sw}`
                        : "0 0 0 2px var(--color-surface)",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldLabel>Días objetivo</FieldLabel>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = (daysMask & (1 << i)) !== 0;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysMask(daysMask ^ (1 << i))}
                  style={on ? { background: c, borderColor: "transparent", color: "#fff" } : undefined}
                  className="h-10 rounded-lg border border-line bg-surface-2 text-sm font-medium text-ink-2"
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setDaysMask(p.mask)}
                className={[
                  "rounded-full border px-3 py-1 text-xs",
                  daysMask === p.mask ? "border-accent text-ink" : "border-line text-ink-2",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}

        <footer className="flex flex-wrap items-center gap-2">
          {category &&
            (confirmDelete ? (
              <button
                type="button"
                onClick={() => remove.mutate(category.id, { onSuccess: onClose })}
                className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-critical hover:bg-critical/10"
              >
                <Trash2 className="size-4" /> ¿Seguro? Se borra el historial
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-critical hover:bg-critical/10"
              >
                <Trash2 className="size-4" /> Eliminar
              </button>
            ))}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar
          </button>
        </footer>
      </form>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold tracking-wide text-ink-2 uppercase">{children}</span>;
}
