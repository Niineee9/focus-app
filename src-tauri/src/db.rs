use serde::Serialize;
use sqlx::postgres::{PgConnectOptions, PgPool, PgPoolOptions};
use std::str::FromStr;
use std::time::Duration;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("connection string inválido: {0}")]
    BadUrl(String),
    #[error("no se pudo conectar: {0}")]
    Connect(String),
    #[error("base de datos: {0}")]
    Db(#[from] sqlx::Error),
    #[error("migraciones: {0}")]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error("configuración: {0}")]
    Config(String),
    #[error("{0}")]
    Invalid(String),
    #[error("sin conexión con la base de datos")]
    NotConnected,
}

impl Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;

/// Información de la conexión, sin credenciales, para mostrar en la interfaz.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub host: String,
    pub database: String,
    pub version: String,
}

/// Interpreta el connection string que copia el usuario desde Neon.
fn parse(url: &str) -> Result<PgConnectOptions> {
    let url = url.trim().trim_matches(|c| c == '\'' || c == '"');
    // Quita el prefijo si se pegó el comando completo `psql '...'`.
    let url = url.strip_prefix("psql ").unwrap_or(url).trim_matches('\'');
    if !url.starts_with("postgres://") && !url.starts_with("postgresql://") {
        return Err(Error::BadUrl("debe empezar por postgresql://".into()));
    }
    // Neon añade `channel_binding=require`, que sqlx no reconoce.
    let cleaned: String = match url.split_once('?') {
        Some((base, query)) => {
            let kept: Vec<&str> = query
                .split('&')
                .filter(|p| !p.starts_with("channel_binding="))
                .collect();
            if kept.is_empty() {
                base.to_string()
            } else {
                format!("{base}?{}", kept.join("&"))
            }
        }
        None => url.to_string(),
    };
    PgConnectOptions::from_str(&cleaned).map_err(|e| Error::BadUrl(e.to_string()))
}

/// Conecta, crea/actualiza las tablas y devuelve el pool listo.
pub async fn connect(url: &str) -> Result<(PgPool, ServerInfo)> {
    let opts = parse(url)?;
    let host = opts.get_host().to_string();
    let database = opts.get_database().unwrap_or("postgres").to_string();
    let pool = PgPoolOptions::new()
        .max_connections(3)
        // Neon puede tardar unos segundos en despertar si estaba suspendido.
        .acquire_timeout(Duration::from_secs(20))
        .connect_with(opts)
        .await
        .map_err(|e| Error::Connect(e.to_string()))?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    let version: String = sqlx::query_scalar("SHOW server_version").fetch_one(&pool).await?;
    Ok((pool, ServerInfo { host, database, version }))
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn accepts_neon_strings() {
        let neon = "postgresql://user:pw@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
        let o = parse(neon).unwrap();
        assert_eq!(o.get_host(), "ep-x-pooler.us-east-2.aws.neon.tech");
        assert_eq!(o.get_database(), Some("neondb"));
        assert!(parse(&format!("psql '{neon}'")).is_ok());
        assert!(parse("mysql://x").is_err());
    }
}
