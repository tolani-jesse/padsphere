use tauri::menu::{CheckMenuItem, CheckMenuItemBuilder, Menu, MenuItemBuilder, SubmenuBuilder};
use tauri::{Emitter, Manager, State};

struct ThemeMenuItems {
    midnight: CheckMenuItem<tauri::Wry>,
    arctic: CheckMenuItem<tauri::Wry>,
    neon: CheckMenuItem<tauri::Wry>,
    analog: CheckMenuItem<tauri::Wry>,
    ocean: CheckMenuItem<tauri::Wry>,
    crimson: CheckMenuItem<tauri::Wry>,
}

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
                                let _ = app_menu.insert(&check_updates, 1);
                                appended = true;
                            }
                        }
                    }

                    if !appended {
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

                // Inject Themes Submenu into View menu
                let theme_midnight = CheckMenuItemBuilder::new("Midnight Dark").id("theme-midnight-dark").checked(true).build(handle).unwrap();
                let theme_arctic = CheckMenuItemBuilder::new("Arctic Light").id("theme-arctic-light").checked(false).build(handle).unwrap();
                let theme_neon = CheckMenuItemBuilder::new("Neon Synthwave").id("theme-neon-synthwave").checked(false).build(handle).unwrap();
                let theme_analog = CheckMenuItemBuilder::new("Analog Studio").id("theme-analog-studio").checked(false).build(handle).unwrap();
                let theme_ocean = CheckMenuItemBuilder::new("Deep Ocean").id("theme-deep-ocean").checked(false).build(handle).unwrap();
                let theme_crimson = CheckMenuItemBuilder::new("Crimson Eclipse").id("theme-crimson-eclipse").checked(false).build(handle).unwrap();

                app.manage(ThemeMenuItems {
                    midnight: theme_midnight.clone(),
                    arctic: theme_arctic.clone(),
                    neon: theme_neon.clone(),
                    analog: theme_analog.clone(),
                    ocean: theme_ocean.clone(),
                    crimson: theme_crimson.clone(),
                });

                if let Ok(themes_submenu) = SubmenuBuilder::new(handle, "Themes")
                    .item(&theme_midnight)
                    .item(&theme_arctic)
                    .item(&theme_neon)
                    .item(&theme_analog)
                    .item(&theme_ocean)
                    .item(&theme_crimson)
                    .build()
                {
                    let mut found_view = false;
                    if let Ok(items) = menu.items() {
                        for item in items.iter() {
                            if let Some(submenu) = item.as_submenu() {
                                if let Ok(text) = submenu.text() {
                                    if text == "View" {
                                        let _ = submenu.append(&themes_submenu);
                                        found_view = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    if !found_view {
                        if let Ok(view_submenu) = SubmenuBuilder::new(handle, "View")
                            .item(&themes_submenu)
                            .build()
                        {
                            let _ = menu.append(&view_submenu);
                        }
                    }
                }
                let _ = app.set_menu(menu);
            }

            app.on_menu_event(move |app, event| {
                let id = event.id().0.as_str();
                if id == "check-updates" {
                    let _ = app.emit("trigger-update-check", ());
                } else if let Some(theme_name) = id.strip_prefix("theme-") {
                    let items = app.state::<ThemeMenuItems>();
                    let _ = items.midnight.set_checked("midnight-dark" == theme_name);
                    let _ = items.arctic.set_checked("arctic-light" == theme_name);
                    let _ = items.neon.set_checked("neon-synthwave" == theme_name);
                    let _ = items.analog.set_checked("analog-studio" == theme_name);
                    let _ = items.ocean.set_checked("deep-ocean" == theme_name);
                    let _ = items.crimson.set_checked("crimson-eclipse" == theme_name);
                    
                    let _ = app.emit("change-theme", theme_name);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sync_theme_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn sync_theme_menu(items: State<'_, ThemeMenuItems>, theme: String) {
    let _ = items.midnight.set_checked("midnight-dark" == theme);
    let _ = items.arctic.set_checked("arctic-light" == theme);
    let _ = items.neon.set_checked("neon-synthwave" == theme);
    let _ = items.analog.set_checked("analog-studio" == theme);
    let _ = items.ocean.set_checked("deep-ocean" == theme);
    let _ = items.crimson.set_checked("crimson-eclipse" == theme);
}
