use tauri::menu::{Menu, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            let handle = app.handle();
            if let Ok(menu) = Menu::default(handle) {
                if let Ok(check_updates) = MenuItemBuilder::new("Check for Updates...")
                    .id("check-updates")
                    .build(handle)
                {
                    if let Ok(help_submenu) = SubmenuBuilder::new(handle, "Help")
                        .item(&check_updates)
                        .build()
                    {
                        let _ = menu.append(&help_submenu);
                    }
                }
                let _ = app.set_menu(menu);
            }

            app.on_menu_event(move |app, event| {
                if event.id().0 == "check-updates" {
                    let _ = app.emit("trigger-update-check", ());
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
