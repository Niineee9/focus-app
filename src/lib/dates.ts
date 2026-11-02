export const WEEKDAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const WEEKDAYS_LETTER = ["L", "M", "X", "J", "V", "S", "D"];
export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const ALL_DAYS = 0b1111111;
export const WEEKDAYS = 0b0011111;
export const WEEKEND = 0b1100000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha local en formato YYYY-MM-DD (sin desfase UTC). */
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function isScheduled(mask: number, iso: string): boolean {
  return (mask & (1 << weekdayIndex(fromISO(iso)))) !== 0;
}

/** Las 6 semanas (42 días, empezando en lunes) que cubren el mes. */
export function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - weekdayIndex(first));
  return Array.from({ length: 42 }, (_, i) =>
    toISO(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
  );
}

export function scheduleLabel(mask: number): string {
  if (mask === ALL_DAYS) return "Todos los días";
  if (mask === WEEKDAYS) return "Lunes a viernes";
  if (mask === WEEKEND) return "Sábado y domingo";
  return WEEKDAYS_SHORT.filter((_, i) => mask & (1 << i)).join(" · ");
}

export function longDate(iso: string): string {
  const d = fromISO(iso);
  const wd = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()];
  return `${wd}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export const pct = (done: number, target: number) =>
  target === 0 ? 0 : Math.round((done / target) * 100);
