//! Consultas de categorías y marcas sobre Postgres.

use crate::db::{Error, Result};
use chrono::{Datelike, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::{HashMap, HashSet};

/// Bitmask de días: bit 0 = lunes … bit 6 = domingo.
pub const ALL_DAYS: u8 = 0b111_1111;
pub const WEEKDAYS: u8 = 0b001_1111;
pub const WEEKEND: u8 = 0b110_0000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub days_mask: u8,
    pub created_at: NaiveDate,
}

impl Category {
    pub fn is_scheduled(&self, date: NaiveDate) -> bool {
        self.days_mask & (1 << date.weekday().num_days_from_monday()) != 0
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryInput {
    pub name: String,
    pub icon: String,
    pub color: String,
    pub days_mask: u8,
}

impl CategoryInput {
    fn validate(&self) -> Result<()> {
        if self.name.trim().is_empty() {
            return Err(Error::Invalid("El nombre no puede estar vacío".into()));
        }
        if self.days_mask & ALL_DAYS == 0 {
            return Err(Error::Invalid("Elige al menos un día de la semana".into()));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Completion {
    pub category_id: i64,
    pub date: NaiveDate,
}

type CategoryRow = (i64, String, String, String, i16, NaiveDate);

fn to_category((id, name, icon, color, mask, created_at): CategoryRow) -> Category {
    Category { id, name, icon, color, days_mask: mask as u8, created_at }
}

pub async fn categories(pool: &PgPool) -> Result<Vec<Category>> {
    let rows: Vec<CategoryRow> = sqlx::query_as(
        "SELECT id, name, icon, color, days_mask, created_at
         FROM categories ORDER BY position, id",
    )
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(to_category).collect())
}

pub async fn create_category(pool: &PgPool, input: &CategoryInput, today: NaiveDate) -> Result<Category> {
    input.validate()?;
    let row: CategoryRow = sqlx::query_as(
        "INSERT INTO categories (name, icon, color, days_mask, created_at, position)
         VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(position), 0) + 1 FROM categories))
         RETURNING id, name, icon, color, days_mask, created_at",
    )
    .bind(input.name.trim())
    .bind(&input.icon)
    .bind(&input.color)
    .bind((input.days_mask & ALL_DAYS) as i16)
    .bind(today)
    .fetch_one(pool)
    .await?;
    Ok(to_category(row))
}

pub async fn update_category(pool: &PgPool, id: i64, input: &CategoryInput) -> Result<()> {
    input.validate()?;
    let done = sqlx::query(
        "UPDATE categories SET name = $1, icon = $2, color = $3, days_mask = $4 WHERE id = $5",
    )
    .bind(input.name.trim())
    .bind(&input.icon)
    .bind(&input.color)
    .bind((input.days_mask & ALL_DAYS) as i16)
    .bind(id)
    .execute(pool)
    .await?;
    if done.rows_affected() == 0 {
        return Err(Error::Invalid("La categoría no existe".into()));
    }
    Ok(())
}

pub async fn delete_category(pool: &PgPool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM categories WHERE id = $1").bind(id).execute(pool).await?;
    Ok(())
}

/// En una base de datos nueva crea las categorías de ejemplo.
pub async fn seed_if_empty(pool: &PgPool, today: NaiveDate) -> Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM categories").fetch_one(pool).await?;
    if count == 0 {
        for (name, icon, color, mask) in [
            ("Ayuno", "Salad", "#1baf7a", ALL_DAYS),
            ("Ejercicio", "Dumbbell", "#2a78d6", WEEKDAYS),
            ("Inglés", "Languages", "#eb6834", WEEKEND),
        ] {
            let input = CategoryInput { name: name.into(), icon: icon.into(), color: color.into(), days_mask: mask };
            create_category(pool, &input, today).await?;
        }
    }
    Ok(())
}

pub async fn completions_between(pool: &PgPool, from: NaiveDate, to: NaiveDate) -> Result<Vec<Completion>> {
    let rows: Vec<(i64, NaiveDate)> =
        sqlx::query_as("SELECT category_id, date FROM completions WHERE date BETWEEN $1 AND $2")
            .bind(from)
            .bind(to)
            .fetch_all(pool)
            .await?;
    Ok(rows.into_iter().map(|(category_id, date)| Completion { category_id, date }).collect())
}

/// Todas las fechas cumplidas, agrupadas por categoría (una sola consulta).
pub async fn all_completion_dates(pool: &PgPool) -> Result<HashMap<i64, HashSet<NaiveDate>>> {
    let rows: Vec<(i64, NaiveDate)> =
        sqlx::query_as("SELECT category_id, date FROM completions").fetch_all(pool).await?;
    let mut map: HashMap<i64, HashSet<NaiveDate>> = HashMap::new();
    for (id, date) in rows {
        map.entry(id).or_default().insert(date);
    }
    Ok(map)
}

/// Marca o desmarca un día. Devuelve `true` si quedó marcado.
pub async fn toggle_completion(pool: &PgPool, category_id: i64, date: NaiveDate, today: NaiveDate) -> Result<bool> {
    if date > today {
        return Err(Error::Invalid("No puedes marcar días futuros".into()));
    }
    let removed = sqlx::query("DELETE FROM completions WHERE category_id = $1 AND date = $2")
        .bind(category_id)
        .bind(date)
        .execute(pool)
        .await?;
    if removed.rows_affected() > 0 {
        return Ok(false);
    }
    sqlx::query("INSERT INTO completions (category_id, date) VALUES ($1, $2) ON CONFLICT DO NOTHING")
        .bind(category_id)
        .bind(date)
        .execute(pool)
        .await?;
    Ok(true)
}
