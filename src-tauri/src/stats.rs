//! Cálculo de rachas y métricas. Funciones puras: reciben las categorías,
//! sus fechas cumplidas y el día de "hoy", para poder probarlas sin reloj.

use crate::repo::Category;
use chrono::{Datelike, Duration, NaiveDate};
use serde::Serialize;
use std::collections::HashSet;

/// Semanas que muestra el mapa de calor de cada categoría.
pub const HISTORY_WEEKS: i64 = 16;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DayStatus {
    /// Día programado y cumplido.
    Done,
    /// Día programado, pasado y sin cumplir.
    Missed,
    /// Hoy, programado y todavía sin cumplir.
    Pending,
    /// Día no programado.
    Off,
    /// Cumplido en un día no programado.
    Extra,
    /// Antes de que existiera la categoría.
    Before,
    Future,
}

#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct Progress {
    pub done: u32,
    pub target: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryDay {
    pub date: NaiveDate,
    pub status: DayStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryStats {
    pub category_id: i64,
    pub current_streak: u32,
    pub best_streak: u32,
    /// Fracción 0..1 de días programados cumplidos desde el inicio.
    pub completion_rate: f64,
    pub scheduled_days: u32,
    pub completed_scheduled: u32,
    pub extra_completions: u32,
    pub done_today: bool,
    pub scheduled_today: bool,
    pub week: Progress,
    pub month: Progress,
    pub history: Vec<HistoryDay>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverallStats {
    /// Días seguidos en los que se cumplió todo lo programado.
    pub perfect_streak: u32,
    pub best_perfect_streak: u32,
    pub today: Progress,
    pub week: Progress,
    pub month: Progress,
    pub completion_rate: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub today: NaiveDate,
    pub overall: OverallStats,
    pub categories: Vec<CategoryStats>,
}

pub struct Tracked<'a> {
    pub category: &'a Category,
    pub done: &'a HashSet<NaiveDate>,
}

impl Tracked<'_> {
    /// Primer día que cuenta: la creación o la primera marca, lo que sea antes.
    fn start(&self) -> NaiveDate {
        self.done
            .iter()
            .copied()
            .chain(std::iter::once(self.category.created_at))
            .min()
            .unwrap()
    }

    /// `Some(cumplido)` si el día está programado y dentro del rango de la categoría.
    fn scheduled(&self, date: NaiveDate, start: NaiveDate) -> Option<bool> {
        (date >= start && self.category.is_scheduled(date)).then(|| self.done.contains(&date))
    }

    fn status(&self, date: NaiveDate, start: NaiveDate, today: NaiveDate) -> DayStatus {
        if date > today {
            return DayStatus::Future;
        }
        if date < start {
            return DayStatus::Before;
        }
        let done = self.done.contains(&date);
        match (self.category.is_scheduled(date), done) {
            (true, true) => DayStatus::Done,
            (true, false) if date == today => DayStatus::Pending,
            (true, false) => DayStatus::Missed,
            (false, true) => DayStatus::Extra,
            (false, false) => DayStatus::Off,
        }
    }
}

fn days(from: NaiveDate, to: NaiveDate) -> impl DoubleEndedIterator<Item = NaiveDate> {
    let n = (to - from).num_days().max(-1) + 1;
    (0..n).map(move |i| from + Duration::days(i))
}

fn week_start(d: NaiveDate) -> NaiveDate {
    d - Duration::days(d.weekday().num_days_from_monday() as i64)
}

fn month_bounds(d: NaiveDate) -> (NaiveDate, NaiveDate) {
    let first = d.with_day(1).unwrap();
    let next = if d.month() == 12 {
        NaiveDate::from_ymd_opt(d.year() + 1, 1, 1)
    } else {
        NaiveDate::from_ymd_opt(d.year(), d.month() + 1, 1)
    }
    .unwrap();
    (first, next.pred_opt().unwrap())
}

/// Racha actual y mejor racha sobre una secuencia de días.
/// `day(d)` devuelve `None` si el día no cuenta (no programado), o `Some(cumplido)`.
/// Hoy sin cumplir no rompe la racha: aún hay tiempo.
fn streaks(
    start: NaiveDate,
    today: NaiveDate,
    day: impl Fn(NaiveDate) -> Option<bool>,
) -> (u32, u32) {
    let (mut run, mut best) = (0u32, 0u32);
    for d in days(start, today) {
        match day(d) {
            Some(true) => {
                run += 1;
                best = best.max(run);
            }
            Some(false) if d < today => run = 0,
            _ => {}
        }
    }
    (run, best)
}

fn progress(
    from: NaiveDate,
    to: NaiveDate,
    day: impl Fn(NaiveDate) -> Option<bool>,
) -> Progress {
    let mut p = Progress::default();
    for d in days(from, to) {
        if let Some(done) = day(d) {
            p.target += 1;
            p.done += done as u32;
        }
    }
    p
}

fn rate(done: u32, total: u32) -> f64 {
    if total == 0 {
        0.0
    } else {
        done as f64 / total as f64
    }
}

pub fn category_stats(t: &Tracked, today: NaiveDate) -> CategoryStats {
    let start = t.start();
    let sched = |d| t.scheduled(d, start);
    let (current_streak, best_streak) = streaks(start, today, sched);

    // Para el porcentaje, hoy solo cuenta si ya está cumplido.
    let mut scheduled_days = 0;
    let mut completed_scheduled = 0;
    for d in days(start, today) {
        match sched(d) {
            Some(true) => {
                scheduled_days += 1;
                completed_scheduled += 1;
            }
            Some(false) if d < today => scheduled_days += 1,
            _ => {}
        }
    }
    let extra_completions = t
        .done
        .iter()
        .filter(|d| !t.category.is_scheduled(**d))
        .count() as u32;

    let ws = week_start(today);
    let (ms, me) = month_bounds(today);
    let history_start = ws - Duration::weeks(HISTORY_WEEKS - 1);
    let history = days(history_start, ws + Duration::days(6))
        .map(|date| HistoryDay { date, status: t.status(date, start, today) })
        .collect();

    CategoryStats {
        category_id: t.category.id,
        current_streak,
        best_streak,
        completion_rate: rate(completed_scheduled, scheduled_days),
        scheduled_days,
        completed_scheduled,
        extra_completions,
        done_today: t.done.contains(&today),
        scheduled_today: t.category.is_scheduled(today),
        week: progress(ws, ws + Duration::days(6), sched),
        month: progress(ms, me, sched),
        history,
    }
}

pub fn overall_stats(tracked: &[Tracked], today: NaiveDate) -> OverallStats {
    let starts: Vec<NaiveDate> = tracked.iter().map(Tracked::start).collect();

    // Un día es "perfecto" si todo lo programado ese día se cumplió.
    let perfect = |d: NaiveDate| -> Option<bool> {
        let mut any = false;
        for (t, &s) in tracked.iter().zip(&starts) {
            match t.scheduled(d, s) {
                Some(false) => return Some(false),
                Some(true) => any = true,
                None => {}
            }
        }
        any.then_some(true)
    };
    let first = starts.iter().copied().min().unwrap_or(today);
    let (perfect_streak, best_perfect_streak) = streaks(first, today, perfect);

    // Suma de días-categoría programados.
    let sum = |from: NaiveDate, to: NaiveDate, only_past: bool| {
        let mut p = Progress::default();
        for (t, &s) in tracked.iter().zip(&starts) {
            for d in days(from.max(s), to) {
                match t.scheduled(d, s) {
                    Some(true) => {
                        p.done += 1;
                        p.target += 1;
                    }
                    Some(false) if !only_past || d < today => p.target += 1,
                    _ => {}
                }
            }
        }
        p
    };
    let ws = week_start(today);
    let (ms, me) = month_bounds(today);
    let all = sum(first, today, true);

    OverallStats {
        perfect_streak,
        best_perfect_streak,
        today: sum(today, today, false),
        week: sum(ws, ws + Duration::days(6), false),
        month: sum(ms, me, false),
        completion_rate: rate(all.done, all.target),
    }
}

pub fn compute(tracked: &[Tracked], today: NaiveDate) -> Stats {
    Stats {
        today,
        overall: overall_stats(tracked, today),
        categories: tracked.iter().map(|t| category_stats(t, today)).collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repo::{ALL_DAYS, WEEKDAYS, WEEKEND};

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    fn cat(id: i64, mask: u8, created: &str) -> Category {
        Category {
            id,
            name: format!("c{id}"),
            icon: String::new(),
            color: String::new(),
            days_mask: mask,
            created_at: d(created),
        }
    }

    fn set(dates: &[&str]) -> HashSet<NaiveDate> {
        dates.iter().map(|s| d(s)).collect()
    }

    // 2026-10-19 es lunes; 2026-10-23 viernes; 2026-10-24/25 fin de semana.

    #[test]
    fn weekday_streak_skips_weekend() {
        let c = cat(1, WEEKDAYS, "2026-10-12");
        let done = set(&["2026-10-15", "2026-10-16", "2026-10-19", "2026-10-20"]);
        let s = category_stats(&Tracked { category: &c, done: &done }, d("2026-10-20"));
        // jue, vie, (fin de semana no cuenta), lun, mar
        assert_eq!(s.current_streak, 4);
        assert_eq!(s.best_streak, 4);
        // 12,13,14 fallados + 4 cumplidos
        assert_eq!(s.scheduled_days, 7);
        assert_eq!(s.completed_scheduled, 4);
    }

    #[test]
    fn today_pending_keeps_streak_but_yesterday_missed_breaks_it() {
        let c = cat(1, ALL_DAYS, "2026-10-19");
        let done = set(&["2026-10-19", "2026-10-20", "2026-10-21"]);
        let t = Tracked { category: &c, done: &done };
        assert_eq!(category_stats(&t, d("2026-10-22")).current_streak, 3);
        let s = category_stats(&t, d("2026-10-23"));
        assert_eq!(s.current_streak, 0);
        assert_eq!(s.best_streak, 3);
    }

    #[test]
    fn weekend_category_week_progress_and_extras() {
        let c = cat(1, WEEKEND, "2026-10-01");
        let done = set(&["2026-10-18", "2026-10-21"]); // domingo + un miércoles extra
        let s = category_stats(&Tracked { category: &c, done: &done }, d("2026-10-23"));
        assert_eq!(s.week.target, 2);
        assert_eq!(s.week.done, 0);
        assert_eq!(s.extra_completions, 1);
        assert_eq!(s.current_streak, 1);
        let wed = s.history.iter().find(|h| h.date == d("2026-10-21")).unwrap();
        assert_eq!(wed.status, DayStatus::Extra);
        assert_eq!(s.history.len() as i64, HISTORY_WEEKS * 7);
    }

    #[test]
    fn perfect_days_require_every_scheduled_category() {
        let fast = cat(1, ALL_DAYS, "2026-10-19");
        let gym = cat(2, WEEKDAYS, "2026-10-19");
        let f = set(&["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"]);
        let g = set(&["2026-10-19", "2026-10-21", "2026-10-22"]);
        let tracked = [
            Tracked { category: &fast, done: &f },
            Tracked { category: &gym, done: &g },
        ];
        let o = overall_stats(&tracked, d("2026-10-23"));
        assert_eq!(o.perfect_streak, 2); // 21 y 22; el 20 faltó ejercicio
        assert_eq!(o.best_perfect_streak, 2);
        assert_eq!(o.today.target, 2);
        assert_eq!(o.today.done, 0);
        assert_eq!(o.week.target, 7 + 5);
    }
}
