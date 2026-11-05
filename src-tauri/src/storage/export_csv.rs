use crate::models::state::ProjectData;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

pub struct CsvExporter;

impl CsvExporter {
    pub fn export_to_file<P: AsRef<Path>>(data: &ProjectData, path: P) -> Result<(), String> {
        let file = File::create(path).map_err(|e| format!("Error al crear archivo CSV: {}", e))?;
        let mut writer = BufWriter::new(file);

        // Write UTF-8 BOM so Microsoft Excel opens accented Spanish letters properly
        writer
            .write_all(&[0xEF, 0xBB, 0xBF])
            .map_err(|e| e.to_string())?;

        // CSV Header (using semicolon delimiter, standard in European/Spanish Excel locales)
        writeln!(
            writer,
            "ID;EDT;Nombre de tarea;Duración (horas);Comienzo;Fin;% Completado;Hito;Resumen;Notas"
        )
        .map_err(|e| e.to_string())?;

        for task in &data.tasks {
            let clean_name = task.name.replace(';', ",");
            let clean_notes = task
                .notes
                .as_deref()
                .unwrap_or("")
                .replace(';', ",")
                .replace('\n', " ");

            writeln!(
                writer,
                "{};{};{};{};{};{};{}%;{};{};{}",
                task.id,
                task.wbs_code,
                clean_name,
                task.duration_hours,
                task.start_date,
                task.finish_date,
                task.percent_complete,
                if task.is_milestone { "Sí" } else { "No" },
                if task.is_summary { "Sí" } else { "No" },
                clean_notes
            )
            .map_err(|e| e.to_string())?;
        }

        writer.flush().map_err(|e| e.to_string())?;
        Ok(())
    }
}
