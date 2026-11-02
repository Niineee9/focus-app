//! Configuración local del dispositivo. El connection string vive solo aquí,
//! en la carpeta privada de la app, nunca en el código ni en el ejecutable.

use crate::db::{Error, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub database_url: Option<String>,
}

pub struct Store {
    path: PathBuf,
}

impl Store {
    pub fn new(dir: &Path) -> Self {
        Self { path: dir.join("config.json") }
    }

    pub fn load(&self) -> Config {
        std::fs::read_to_string(&self.path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, config: &Config) -> Result<()> {
        if let Some(dir) = self.path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| Error::Config(e.to_string()))?;
        }
        let json = serde_json::to_string_pretty(config).map_err(|e| Error::Config(e.to_string()))?;
        std::fs::write(&self.path, json).map_err(|e| Error::Config(e.to_string()))
    }
}
