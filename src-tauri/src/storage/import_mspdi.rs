use crate::engine::scheduler::Scheduler;
use crate::models::{
    calendar::Calendar,
    dependency::{Dependency, DependencyType},
    project::ProjectMeta,
    state::ProjectData,
    task::Task,
};
use quick_xml::events::Event;
use quick_xml::reader::Reader;
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

pub struct MspdiImporter;

impl MspdiImporter {
    pub fn import_from_file<P: AsRef<Path>>(path: P) -> Result<ProjectData, String> {
        let file = File::open(&path).map_err(|e| format!("No se pudo abrir el archivo XML: {}", e))?;
        let buf_reader = BufReader::new(file);
        let mut reader = Reader::from_reader(buf_reader);
        reader.config_mut().trim_text(true);

        let mut project_meta = ProjectMeta::default();
        let mut tasks: Vec<Task> = Vec::new();
        let mut dependencies: Vec<Dependency> = Vec::new();

        let mut current_tag = String::new();
        let mut in_task = false;
        let mut in_predecessor = false;

        let mut current_task = Task::default();
        let mut outline_level = 1;
        let mut pred_uid: Option<i64> = None;
        let mut pred_type = DependencyType::FS;
        let mut pred_lag_hours = 0.0;

        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                    current_tag = tag_name.clone();

                    if tag_name == "Task" {
                        in_task = true;
                        current_task = Task::default();
                        outline_level = 1;
                    } else if tag_name == "PredecessorLink" {
                        in_predecessor = true;
                        pred_uid = None;
                        pred_type = DependencyType::FS;
                        pred_lag_hours = 0.0;
                    }
                }
                Ok(Event::Text(ref e)) => {
                    let text = e.unescape().unwrap_or_default().to_string();

                    if in_predecessor {
                        match current_tag.as_str() {
                            "PredecessorUID" => {
                                pred_uid = text.parse::<i64>().ok();
                            }
                            "Type" => {
                                pred_type = match text.as_str() {
                                    "0" | "FF" => DependencyType::FF,
                                    "1" | "FS" => DependencyType::FS,
                                    "2" | "SF" => DependencyType::SF,
                                    "3" | "SS" => DependencyType::SS,
                                    _ => DependencyType::FS,
                                };
                            }
                            "LinkLag" => {
                                if let Ok(val) = text.parse::<f64>() {
                                    pred_lag_hours = val / (10.0 * 60.0);
                                }
                            }
                            _ => {}
                        }
                    } else if in_task {
                        match current_tag.as_str() {
                            "UID" | "ID" => {
                                if let Ok(id) = text.parse::<i64>() {
                                    if id > 0 {
                                        current_task.id = id;
                                        current_task.sort_order = id as i32;
                                    }
                                }
                            }
                            "Name" => {
                                current_task.name = text;
                            }
                            "Duration" => {
                                current_task.duration_hours = Self::parse_iso_duration(&text);
                            }
                            "Start" => {
                                current_task.start_date = Self::clean_date_string(&text);
                            }
                            "Finish" => {
                                current_task.finish_date = Self::clean_date_string(&text);
                            }
                            "PercentComplete" => {
                                if let Ok(p) = text.parse::<f64>() {
                                    current_task.percent_complete = p;
                                }
                            }
                            "Milestone" => {
                                current_task.is_milestone = text == "1" || text.to_lowercase() == "true";
                            }
                            "Summary" => {
                                current_task.is_summary = text == "1" || text.to_lowercase() == "true";
                            }
                            "OutlineLevel" => {
                                if let Ok(lvl) = text.parse::<usize>() {
                                    outline_level = lvl;
                                }
                            }
                            "OutlineNumber" | "WBS" => {
                                current_task.wbs_code = text;
                            }
                            "Notes" => {
                                current_task.notes = Some(text);
                            }
                            _ => {}
                        }
                    } else {
                        // Project level metadata
                        match current_tag.as_str() {
                            "Name" | "Title" => {
                                if !text.is_empty() {
                                    project_meta.name = text;
                                }
                            }
                            "StartDate" => {
                                if !text.is_empty() {
                                    project_meta.project_start_date = Self::clean_date_string(&text);
                                }
                            }
                            _ => {}
                        }
                    }
                }
                Ok(Event::End(ref e)) => {
                    let tag_name = String::from_utf8_lossy(e.name().as_ref()).to_string();

                    if tag_name == "PredecessorLink" {
                        in_predecessor = false;
                        if let Some(puid) = pred_uid {
                            dependencies.push(Dependency {
                                id: uuid::Uuid::new_v4().to_string(),
                                predecessor_id: puid,
                                successor_id: current_task.id,
                                dep_type: pred_type,
                                lag_hours: pred_lag_hours,
                            });
                        }
                    } else if tag_name == "Task" {
                        in_task = false;
                        let _ = outline_level;
                        if current_task.id > 0 {
                            tasks.push(current_task.clone());
                        }
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(format!("Error de sintaxis XML: {:?}", e)),
                _ => {}
            }
            buf.clear();
        }

        Self::reconstruct_parent_ids(&mut tasks);

        let mut project_data = ProjectData {
            meta: project_meta,
            calendar: Calendar::default(),
            exceptions: Vec::new(),
            tasks,
            dependencies,
            file_path: Some(path.as_ref().to_string_lossy().to_string()),
        };

        Scheduler::recalculate(&mut project_data);

        Ok(project_data)
    }

    fn parse_iso_duration(s: &str) -> f64 {
        let text = s.trim();
        if !text.starts_with("PT") {
            return 8.0;
        }

        let mut hours = 0.0;
        let mut num_str = String::new();

        for ch in text[2..].chars() {
            if ch.is_ascii_digit() || ch == '.' {
                num_str.push(ch);
            } else if ch == 'H' {
                if let Ok(v) = num_str.parse::<f64>() {
                    hours += v;
                }
                num_str.clear();
            } else if ch == 'M' {
                if let Ok(v) = num_str.parse::<f64>() {
                    hours += v / 60.0;
                }
                num_str.clear();
            } else {
                num_str.clear();
            }
        }

        hours
    }

    fn clean_date_string(s: &str) -> String {
        let text = s.trim();
        if text.len() >= 19 {
            text[..19].to_string()
        } else {
            text.to_string()
        }
    }

    fn reconstruct_parent_ids(tasks: &mut [Task]) {
        for i in 0..tasks.len() {
            let wbs = tasks[i].wbs_code.clone();
            if let Some(last_dot) = wbs.rfind('.') {
                let parent_wbs = &wbs[..last_dot];
                if let Some(parent) = tasks.iter().find(|t| t.wbs_code == parent_wbs) {
                    tasks[i].parent_id = Some(parent.id);
                }
            }
        }
    }
}
