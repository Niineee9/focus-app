mod config;
mod db;
mod repo;
mod stats;

use chrono::NaiveDate;
use config::{Config, Store};
use db::{Error, Result, ServerInfo};
use repo::{Category, CategoryInput, Completion};
use serde::Serialize;
use sqlx::PgPool;
use std::collections::HashSet;
use tauri::{Manager, State};
use tokio::sync::Mutex;

/// Estado compartido: la configuración local y la conexión activa (si la hay).
struct App {
    store: Store,
    conn: Mutex<Option<(PgPool, ServerInfo)>>,
}

impl App {
    /// El pool es un `Arc` interno: clonarlo es barato y libera el candado enseguida.
    async fn pool(&self) -> Result<PgPool> {
        self.conn.lock().await.as_ref().map(|(p, _)| p.clone()).ok_or(Error::NotConnected)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Status {
    configured: bool,
    server: Option<ServerInfo>,
    error: Option<String>,
}

/// Estado de la conexión. Si hay configuración guardada pero aún no hay
/// conexión (p. ej. al arrancar), intenta conectar.
#[tauri::command]
async fn status(app: State<'_, App>, today: NaiveDate) -> Result<Status> {
    let mut conn = app.conn.lock().await;
    if let Some((_, info)) = conn.as_ref() {
        return Ok(Status { configured: true, server: Some(info.clone()), error: None });
    }
    let Some(url) = app.store.load().database_url else {
        return Ok(Status { configured: false, server: None, error: None });
    };
    match open(&url, today).await {
        Ok((pool, info)) => {
            *conn = Some((pool, info.clone()));
            Ok(Status { configured: true, server: Some(info), error: None })
        }
        Err(e) => Ok(Status { configured: true, server: None, error: Some(e.to_string()) }),
    }
}

async fn open(url: &str, today: NaiveDate) -> Result<(PgPool, ServerInfo)> {
    let (pool, info) = db::connect(url).await?;
    repo::seed_if_empty(&pool, today).await?;
    Ok((pool, info))
}

/// Prueba el connection string; si funciona, lo guarda y queda conectado.
#[tauri::command]
async fn connect(app: State<'_, App>, url: String, today: NaiveDate) -> Result<ServerInfo> {
    let (pool, info) = open(&url, today).await?;
    app.store.save(&Config { database_url: Some(url.trim().to_string()) })?;
    if let Some((old, _)) = app.conn.lock().await.replace((pool, info.clone())) {
        old.close().await;
    }
    Ok(info)
}

/// Olvida la conexión de este dispositivo (los datos en Neon no se tocan).
#[tauri::command]
async fn disconnect(app: State<'_, App>) -> Result<()> {
    app.store.save(&Config::default())?;
    if let Some((pool, _)) = app.conn.lock().await.take() {
        pool.close().await;
    }
    Ok(())
}

#[tauri::command]
async fn list_categories(app: State<'_, App>) -> Result<Vec<Category>> {
    repo::categories(&app.pool().await?).await
}

#[tauri::command]
async fn create_category(app: State<'_, App>, input: CategoryInput, today: NaiveDate) -> Result<Category> {
    repo::create_category(&app.pool().await?, &input, today).await
}

#[tauri::command]
async fn update_category(app: State<'_, App>, id: i64, input: CategoryInput) -> Result<()> {
    repo::update_category(&app.pool().await?, id, &input).await
}

#[tauri::command]
async fn delete_category(app: State<'_, App>, id: i64) -> Result<()> {
    repo::delete_category(&app.pool().await?, id).await
}

#[tauri::command]
async fn get_completions(app: State<'_, App>, from: NaiveDate, to: NaiveDate) -> Result<Vec<Completion>> {
    repo::completions_between(&app.pool().await?, from, to).await
}

#[tauri::command]
async fn toggle_completion(
    app: State<'_, App>,
    category_id: i64,
    date: NaiveDate,
    today: NaiveDate,
) -> Result<bool> {
    repo::toggle_completion(&app.pool().await?, category_id, date, today).await
}

/// `today` llega desde la interfaz para usar siempre la fecha local del dispositivo.
#[tauri::command]
async fn get_stats(app: State<'_, App>, today: NaiveDate) -> Result<stats::Stats> {
    let pool = app.pool().await?;
    let (categories, mut done) =
        tokio::try_join!(repo::categories(&pool), repo::all_completion_dates(&pool))?;
    let sets: Vec<HashSet<NaiveDate>> =
        categories.iter().map(|c| done.remove(&c.id).unwrap_or_default()).collect();
    let tracked: Vec<stats::Tracked> = categories
        .iter()
        .zip(&sets)
        .map(|(category, done)| stats::Tracked { category, done })
        .collect();
    Ok(stats::compute(&tracked, today))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_config_dir()?;
            app.manage(App { store: Store::new(&dir), conn: Mutex::new(None) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            status,
            connect,
            disconnect,
            list_categories,
            create_category,
            update_category,
            delete_category,
            get_completions,
            toggle_completion,
            get_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Focus");
}
