use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Calendar {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub mon_hours: f64,
    pub tue_hours: f64,
    pub wed_hours: f64,
    pub thu_hours: f64,
    pub fri_hours: f64,
    pub sat_hours: f64,
    pub sun_hours: f64,
}

impl Default for Calendar {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: "Estándar".to_string(),
            is_default: true,
            mon_hours: 8.0,
            tue_hours: 8.0,
            wed_hours: 8.0,
            thu_hours: 8.0,
            fri_hours: 8.0,
            sat_hours: 0.0,
            sun_hours: 0.0,
        }
    }
}

impl Calendar {
    pub fn hours_for_weekday(&self, weekday: chrono::Weekday) -> f64 {
        use chrono::Weekday::*;
        match weekday {
            Mon => self.mon_hours,
            Tue => self.tue_hours,
            Wed => self.wed_hours,
            Thu => self.thu_hours,
            Fri => self.fri_hours,
            Sat => self.sat_hours,
            Sun => self.sun_hours,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarException {
    pub id: String,
    pub calendar_id: String,
    pub exception_date: String, // YYYY-MM-DD
    pub is_working: bool,
    pub working_hours: f64,
    pub description: Option<String>,
}
