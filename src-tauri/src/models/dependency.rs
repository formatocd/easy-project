use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum DependencyType {
    FS, // Finish to Start (default)
    SS, // Start to Start
    FF, // Finish to Finish
    SF, // Start to Finish
}

impl Default for DependencyType {
    fn default() -> Self {
        DependencyType::FS
    }
}

impl DependencyType {
    pub fn as_str(&self) -> &'static str {
        match self {
            DependencyType::FS => "FS",
            DependencyType::SS => "SS",
            DependencyType::FF => "FF",
            DependencyType::SF => "SF",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "SS" => DependencyType::SS,
            "FF" => DependencyType::FF,
            "SF" => DependencyType::SF,
            _ => DependencyType::FS,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub id: String,
    pub predecessor_id: i64,
    pub successor_id: i64,
    pub dep_type: DependencyType,
    pub lag_hours: f64,
}

impl Dependency {
    /// Formats a single dependency into shorthand (e.g. "4", "4SS+2d", "7FF-4h")
    pub fn to_shorthand(&self, hours_per_day: f64) -> String {
        let mut s = format!("{}", self.predecessor_id);
        if self.dep_type != DependencyType::FS {
            s.push_str(self.dep_type.as_str());
        }

        if self.lag_hours.abs() > 0.001 {
            let sign = if self.lag_hours > 0.0 { "+" } else { "-" };
            let abs_lag = self.lag_hours.abs();
            if (abs_lag % hours_per_day).abs() < 0.001 {
                let days = abs_lag / hours_per_day;
                s.push_str(&format!("{}{:.1}d", sign, days).replace(".0d", "d"));
            } else {
                s.push_str(&format!("{}{:.1}h", sign, abs_lag).replace(".0h", "h"));
            }
        }
        s
    }

    /// Parses shorthand strings such as "4", "4SS+2d", "7FF-4h", "2; 5"
    pub fn parse_shorthand_list(
        successor_id: i64,
        input: &str,
        hours_per_day: f64,
    ) -> Vec<Dependency> {
        let mut list = Vec::new();
        let cleaned = input.replace(';', ",");
        for part in cleaned.split(',') {
            let item = part.trim();
            if item.is_empty() {
                continue;
            }
            if let Some(dep) = Self::parse_single(successor_id, item, hours_per_day) {
                list.push(dep);
            }
        }
        list
    }

    pub fn parse_single(successor_id: i64, input: &str, hours_per_day: f64) -> Option<Dependency> {
        let text = input.trim();
        if text.is_empty() {
            return None;
        }

        let clean_text = text.trim_start_matches(|c: char| !c.is_ascii_digit() && c != '-');
        let mut pred_str = String::new();
        let mut rest = "";

        for (idx, ch) in clean_text.char_indices() {
            if ch.is_ascii_digit() {
                pred_str.push(ch);
            } else {
                rest = &clean_text[idx..];
                break;
            }
        }

        let predecessor_id: i64 = pred_str.parse().ok()?;
        if predecessor_id == successor_id {
            return None;
        }

        let mut dep_type = DependencyType::FS;
        let mut lag_hours = 0.0;
        let rest_trimmed = rest.trim();
        let upper = rest_trimmed.to_uppercase();

        let lag_part = if upper.starts_with("FS") {
            dep_type = DependencyType::FS;
            &rest_trimmed[2..]
        } else if upper.starts_with("SS") {
            dep_type = DependencyType::SS;
            &rest_trimmed[2..]
        } else if upper.starts_with("FF") {
            dep_type = DependencyType::FF;
            &rest_trimmed[2..]
        } else if upper.starts_with("SF") {
            dep_type = DependencyType::SF;
            &rest_trimmed[2..]
        } else {
            rest_trimmed
        };

        let lag_str = lag_part.trim();
        if !lag_str.is_empty() {
            let (sign, num_part) = if lag_str.starts_with('+') {
                (1.0, &lag_str[1..])
            } else if lag_str.starts_with('-') {
                (-1.0, &lag_str[1..])
            } else {
                (1.0, lag_str)
            };

            let num_part = num_part.trim();
            let mut val_str = String::new();
            let mut unit = 'h';

            for ch in num_part.chars() {
                if ch.is_ascii_digit() || ch == '.' {
                    val_str.push(ch);
                } else if ch == 'd' || ch == 'D' || ch == 'h' || ch == 'H' || ch == 'w' || ch == 'W' {
                    unit = ch.to_ascii_lowercase();
                }
            }

            if let Ok(val) = val_str.parse::<f64>() {
                let multiplier = match unit {
                    'd' => hours_per_day,
                    'w' => hours_per_day * 5.0,
                    _ => 1.0,
                };
                lag_hours = sign * val * multiplier;
            }
        }

        Some(Dependency {
            id: uuid::Uuid::new_v4().to_string(),
            predecessor_id,
            successor_id,
            dep_type,
            lag_hours,
        })
    }
}
