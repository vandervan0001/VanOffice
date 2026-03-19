#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

const PORT: u16 = 3274;

struct ServerChild(Mutex<Option<Child>>);

fn wait_for_server(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{}", port);
    for _ in 0..60 {
        if let Ok(resp) = reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(2))
            .build()
            .unwrap()
            .get(&url)
            .send()
        {
            if resp.status().is_success() || resp.status().is_redirection() {
                return true;
            }
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    false
}

fn main() {
    tauri::Builder::default()
        .manage(ServerChild(Mutex::new(None)))
        .setup(|app| {
            // Find the standalone server
            let server_script = app
                .path()
                .resource_dir()
                .unwrap_or_default()
                .join("standalone")
                .join("server.js");

            let server_script = if server_script.exists() {
                server_script
            } else {
                std::env::current_dir()
                    .unwrap_or_default()
                    .join(".next")
                    .join("standalone")
                    .join("server.js")
            };

            // Data dir
            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap().join(".data"));

            std::fs::create_dir_all(&data_dir).ok();

            // Spawn Node.js
            let child = Command::new("node")
                .arg(&server_script)
                .env("PORT", PORT.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env(
                    "TEAM_FOUNDRY_DATA_DIR",
                    data_dir.to_str().unwrap_or(".data"),
                )
                .spawn()
                .expect("Failed to start Node.js server. Is Node.js installed?");

            app.state::<ServerChild>().0.lock().unwrap().replace(child);

            println!("Waiting for server on port {}...", PORT);
            if wait_for_server(PORT) {
                println!("Server ready!");
            } else {
                eprintln!("Server did not start in time.");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
