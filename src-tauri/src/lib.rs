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
                    let mut appended = false;
                    
                    #[cfg(target_os = "macos")]
                    if let Ok(items) = menu.items() {
                        if let Some(app_menu_item) = items.first() {
                            if let Some(app_menu) = app_menu_item.as_submenu() {
                                // Insert right after "About PadSphere"
                                let _ = app_menu.insert(&check_updates, 1);
                                appended = true;
                            }
                        }
                    }

                    if !appended {
                        // For Windows/Linux or fallback, find existing Help or create it
                        let mut found_help = false;
                        if let Ok(items) = menu.items() {
                            for item in items.iter() {
                                if let Some(submenu) = item.as_submenu() {
                                    if let Ok(text) = submenu.text() {
                                        if text == "Help" {
                                            let _ = submenu.append(&check_updates);
                                            found_help = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if !found_help {
                            if let Ok(help_submenu) = SubmenuBuilder::new(handle, "Help")
                                .item(&check_updates)
                                .build()
                            {
                                let _ = menu.append(&help_submenu);
                            }
                        }
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
