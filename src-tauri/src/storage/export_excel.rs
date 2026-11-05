use crate::models::state::ProjectData;
use rust_xlsxwriter::{Format, Workbook};
use std::path::Path;

pub struct ExcelExporter;

impl ExcelExporter {
    pub fn export_to_file<P: AsRef<Path>>(data: &ProjectData, path: P) -> Result<(), String> {
        let path_str = path.as_ref().to_str().ok_or("Ruta no válida")?;
        let mut workbook = Workbook::new(path_str);
        let worksheet = workbook.add_worksheet();

        // Formats
        let header_format = Format::new().set_bold();
        let summary_format = Format::new().set_bold();
        let regular_format = Format::new();

        // Write Headers
        let headers = [
            "ID",
            "EDT / WBS",
            "Nombre de tarea",
            "Duración (h)",
            "Comienzo",
            "Fin",
            "% Completado",
            "Hito",
            "Notas",
        ];

        for (col, text) in headers.iter().enumerate() {
            worksheet
                .write_string(0, col as u16, *text, &header_format)
                .map_err(|e| e.to_string())?;
        }

        // Write Rows
        for (idx, task) in data.tasks.iter().enumerate() {
            let row = (idx + 1) as u32;
            let fmt = if task.is_summary {
                &summary_format
            } else {
                &regular_format
            };

            // Depth calculation for indentation in Excel
            let depth = task.wbs_code.matches('.').count();
            let indent_spaces = "  ".repeat(depth);
            let display_name = format!("{}{}", indent_spaces, task.name);

            worksheet.write_number(row, 0, task.id as f64, fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 1, &task.wbs_code, fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 2, &display_name, fmt).map_err(|e| e.to_string())?;
            worksheet.write_number(row, 3, task.duration_hours, fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 4, &task.start_date, fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 5, &task.finish_date, fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 6, &format!("{}%", task.percent_complete), fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 7, if task.is_milestone { "Sí" } else { "No" }, fmt).map_err(|e| e.to_string())?;
            worksheet.write_string(row, 8, task.notes.as_deref().unwrap_or(""), fmt).map_err(|e| e.to_string())?;
        }

        // Adjust column widths
        worksheet.set_column_width(0, 8.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(1, 12.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(2, 36.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(3, 14.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(4, 20.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(5, 20.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(6, 14.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(7, 8.0).map_err(|e| e.to_string())?;
        worksheet.set_column_width(8, 25.0).map_err(|e| e.to_string())?;

        workbook.close().map_err(|e| format!("Error al guardar Excel: {}", e))?;
        Ok(())
    }
}
