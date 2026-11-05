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
        Self {
            meta: ProjectMeta::default(),
            calendar: Calendar::default(),
            exceptions: Vec::new(),
            tasks: Vec::new(),
            dependencies: Vec::new(),
            file_path: None,
        }
    }
}
