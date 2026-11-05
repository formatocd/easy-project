use crate::models::{
    calendar::{Calendar, CalendarException},
    dependency::Dependency,
    project::ProjectMeta,
    task::Task,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskDto {
    #[serde(flatten)]
    pub task: Task,
    pub predecessors_display: String,
    pub depth: usize,
    pub has_children: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub meta: ProjectMeta,
    pub calendar: Calendar,
    pub exceptions: Vec<CalendarException>,
    pub tasks: Vec<Task>,
    pub dependencies: Vec<Dependency>,
    pub file_path: Option<String>,
}

impl Default for ProjectData {
    fn default() -> Self {
        let meta = ProjectMeta::default();
        let calendar = Calendar::default();

        let initial_tasks = vec![
            Task {
                id: 1,
                parent_id: None,
                wbs_code: "1".to_string(),
                sort_order: 1,
                name: "Fase de Inicio".to_string(),
                duration_hours: 16.0,
                start_date: meta.project_start_date.clone(),
                finish_date: meta.project_start_date.clone(),
                constraint_type: None,
                constraint_date: None,
                percent_complete: 0.0,
                is_milestone: false,
                is_summary: true,
                baseline_start: None,
                baseline_finish: None,
                baseline_duration_hours: None,
                notes: None,
            },
            Task {
                id: 2,
                parent_id: Some(1),
                wbs_code: "1.1".to_string(),
                sort_order: 2,
                name: "Definición de Requisitos".to_string(),
                duration_hours: 8.0,
                start_date: meta.project_start_date.clone(),
                finish_date: meta.project_start_date.clone(),
                constraint_type: None,
                constraint_date: None,
                percent_complete: 0.0,
                is_milestone: false,
                is_summary: false,
                baseline_start: None,
                baseline_finish: None,
                baseline_duration_hours: None,
                notes: None,
            },
            Task {
                id: 3,
                parent_id: Some(1),
                wbs_code: "1.2".to_string(),
                sort_order: 3,
                name: "Aprobación del Acta de Constitución".to_string(),
                duration_hours: 8.0,
                start_date: meta.project_start_date.clone(),
                finish_date: meta.project_start_date.clone(),
                constraint_type: None,
                constraint_date: None,
                percent_complete: 0.0,
                is_milestone: false,
                is_summary: false,
                baseline_start: None,
                baseline_finish: None,
                baseline_duration_hours: None,
                notes: None,
            },
            Task {
                id: 4,
                parent_id: None,
                wbs_code: "2".to_string(),
                sort_order: 4,
                name: "Hito de Arranque".to_string(),
                duration_hours: 0.0,
                start_date: meta.project_start_date.clone(),
                finish_date: meta.project_start_date.clone(),
                constraint_type: None,
                constraint_date: None,
                percent_complete: 0.0,
                is_milestone: true,
                is_summary: false,
                baseline_start: None,
                baseline_finish: None,
                baseline_duration_hours: None,
                notes: None,
            },
        ];

        let dependencies = vec![
            Dependency {
                id: uuid::Uuid::new_v4().to_string(),
                predecessor_id: 2,
                successor_id: 3,
                dep_type: crate::models::dependency::DependencyType::FS,
                lag_hours: 0.0,
            },
            Dependency {
                id: uuid::Uuid::new_v4().to_string(),
                predecessor_id: 3,
                successor_id: 4,
                dep_type: crate::models::dependency::DependencyType::FS,
                lag_hours: 0.0,
            },
        ];

        Self {
            meta,
            calendar,
            exceptions: Vec::new(),
            tasks: initial_tasks,
            dependencies,
            file_path: None,
        }
    }
}
