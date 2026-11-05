use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ScheduleFrom {
    Start,
    Finish,
}

impl Default for ScheduleFrom {
    fn default() -> Self {
        ScheduleFrom::Start
    }
}

impl ScheduleFrom {
    pub fn as_str(&self) -> &'static str {
        match self {
            ScheduleFrom::Start => "START",
            ScheduleFrom::Finish => "FINISH",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "FINISH" => ScheduleFrom::Finish,
            _ => ScheduleFrom::Start,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub schedule_from: ScheduleFrom,
    pub project_start_date: String,
    pub project_finish_date: Option<String>,
    pub hours_per_day: f64,
    pub hours_per_week: f64,
    pub days_per_month: f64,
    pub currency_symbol: String,
    pub schema_version: i32,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for ProjectMeta {
    fn default() -> Self {
        let now = Utc::now().naive_utc().format("%Y-%m-%dT08:00:00").to_string();
        Self {
            id: Uuid::new_v4().to_string(),
            name: "Nuevo Proyecto".to_string(),
            schedule_from: ScheduleFrom::Start,
            project_start_date: now.clone(),
            project_finish_date: None,
            hours_per_day: 8.0,
            hours_per_week: 40.0,
            days_per_month: 20.0,
            currency_symbol: "€".to_string(),
            schema_version: 1,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
