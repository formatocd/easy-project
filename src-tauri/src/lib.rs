pub mod commands;
pub mod engine;
pub mod models;
pub mod storage;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_project,
            commands::new_project,
            commands::open_project_file,
            commands::save_project_file,
            commands::export_project_csv,
            commands::export_project_excel,
            commands::import_project_xml,
            commands::update_task,
            commands::add_task,
            commands::delete_task,
            commands::indent_task,
            commands::outdent_task,
            commands::set_task_predecessors,
            commands::add_dependency,
            commands::remove_dependency,
            commands::save_baseline,
            commands::clear_baseline,
            commands::undo,
            commands::redo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
