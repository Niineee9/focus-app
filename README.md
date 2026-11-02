# Focus

Calendario de hábitos para **Windows** y **Android**. Cada hábito tiene sus días objetivo. Lo marcas con una ✕ y Focus te lleva las rachas y las métricas. Los datos se guardan en **tu propia base de datos Postgres en [Neon](https://neon.tech)**, así que el PC y el celular ven lo mismo.

- Categorías con nombre, icono, color y días objetivo (todos los días, lunes a viernes, fin de semana o los que elijas).
- Calendario mensual. Filtra por una categoría y marca cada día con una ✕ grande.
- Rachas (por categoría y de "día perfecto"), cumplimiento semanal, mensual e histórico, y un mapa de calor de 16 semanas.
- Sin cuentas ni login. La app se conecta directamente a la base de datos que tú le indiques.

**Stack:** Tauri 2 · Rust (sqlx + motor de estadísticas) · React 19 · Vite · TypeScript · Tailwind CSS v4 · Lucide · TanStack Query · Neon Postgres.

---

## 1. Crea tu base de datos en Neon

1. Crea una cuenta gratuita en <https://console.neon.tech>.
2. Crea un proyecto nuevo. La región que te quede más cerca va bien.
3. En el panel del proyecto, pulsa **Connect** y copia el **connection string**. Se ve así:

   ```
   postgresql://usuario:contraseña@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

No necesitas crear tablas. Focus las crea solo la primera vez que se conecta, junto con tres hábitos de ejemplo (Ayuno, Ejercicio e Inglés) que puedes editar o borrar.

> ⚠️ El connection string incluye tu usuario y contraseña. **No lo subas a git ni lo compartas.** Focus lo guarda solo en tu dispositivo:
> - Windows: `%APPDATA%\com.niineee9.focusapp\config.json`
> - Android: en el almacenamiento privado de la app.

## 2. Instala la app

Descarga el instalador de la sección **Releases** del repositorio, o compílala tú (ver más abajo).

La primera vez que la abras, pega tu connection string y pulsa **Conectar**. Si después quieres cambiar de base de datos, ve a **Ajustes → Cambiar base de datos**.

Si usas la misma base de datos en el PC y en el celular, los dos comparten los hábitos y las marcas.

---

## 3. Compilar desde el código

### Requisitos

- [Node.js](https://nodejs.org) 20 o más reciente
- [Rust](https://rustup.rs) (estable)
- Windows: [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (Windows 10/11 ya lo traen) y las *Build Tools* de Visual Studio con C++
- Android (opcional):
  - [Android Studio](https://developer.android.com/studio) con el SDK, el NDK y la JDK 17 o más reciente.
  - Las variables `ANDROID_HOME`, `NDK_HOME` y `JAVA_HOME`.
  - Los targets de Rust: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

Consulta la [guía de requisitos de Tauri](https://v2.tauri.app/start/prerequisites/) si algo falla.

```bash
git clone https://github.com/Niineee9/focus-app.git
cd focus-app
npm install
```

### Desarrollo

```bash
npm run tauri dev                  # ventana de escritorio
npm run tauri android dev          # emulador o celular conectado por USB
```

### Windows (.exe)

```bash
npm run tauri build
```

El instalador queda en `src-tauri/target/release/bundle/nsis/Focus_<versión>_x64-setup.exe`.

### Android (.apk)

Android solo instala APKs firmados, así que primero crea **tu propia** clave. Hazlo una sola vez y guárdala fuera del repositorio:

```bash
keytool -genkeypair -v -keystore ~/.android/focus-app.jks -storetype PKCS12 \
  -keyalg RSA -keysize 2048 -validity 10000 -alias focus
```

Después crea el archivo `src-tauri/gen/android/keystore.properties`. Está en `.gitignore`, así que nunca se sube:

```properties
keyAlias=focus
password=LA_CONTRASEÑA_QUE_ELEGISTE
storeFile=C:/Users/tu-usuario/.android/focus-app.jks
```

Y compila:

```bash
npm run tauri android build -- --apk --target aarch64
```

El APK firmado queda en `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`. Pásalo al celular y ábrelo. Android te pedirá permitir la instalación desde esa fuente.

> Guarda bien el `.jks` y su contraseña. Para actualizar la app en el celular, el APK nuevo debe estar firmado con la misma clave.

---

## Estructura

```
src/                 Interfaz en React (vistas, componentes, consultas)
src-tauri/src/
  db.rs              Conexión a Postgres y migraciones
  repo.rs            Consultas de categorías y marcas
  stats.rs           Rachas y métricas (con tests)
  config.rs          Connection string guardado en el dispositivo
  lib.rs             Comandos que llama la interfaz
src-tauri/migrations Esquema SQL (se aplica automáticamente)
src-tauri/gen/android Proyecto Android generado por Tauri
```

Para ejecutar los tests del motor de estadísticas:

```bash
cd src-tauri && cargo test --lib
```
