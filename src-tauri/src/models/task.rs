use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub wbs_code: String,
    pub sort_order: i32,
    pub name: String,
    pub duration_hours: f64,
    pub start_date: String,
    pub finish_date: String,
    pub constraint_type: Option<String>,
    pub constraint_date: Option<String>,
    pub percent_complete: f64,
    pub is_milestone: bool,
    pub is_summary: bool,
    pub baseline_start: Option<String>,
    pub baseline_finish: Option<String>,
    pub baseline_duration_hours: Option<f64>,
    pub notes: Option<String>,
}

impl Default for Task {
    fn default() -> Self {
        Self {
            id: 1,
            parent_id: None,
            wbs_code: "1".to_string(),
            sort_order: 1,
            name: "Nueva tarea".to_string(),
            duration_hours: 8.0,
            start_date: "".to_string(),
            finish_date: "".to_string(),
            constraint_type: None,
            constraint_date: None,
            percent_complete: 0.0,
            is_milestone: false,
            is_summary: false,
            baseline_start: None,
            baseline_finish: None,
            baseline_duration_hours: None,
            notes: None,
        }
    }
}
