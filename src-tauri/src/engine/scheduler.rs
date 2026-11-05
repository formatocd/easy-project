use crate::engine::{
    calendar_calc::CalendarCalculator,
    dag::DependencyGraph,
    wbs::WbsCalculator,
};
use crate::models::{
    dependency::{Dependency, DependencyType},
    project::ScheduleFrom,
    state::ProjectData,
    task::Task,
};
use chrono::NaiveDateTime;
use std::collections::{HashMap, HashSet};
use std::time::Instant;

pub struct ScheduleResult {
    pub success: bool,
    pub error_message: Option<String>,
    pub elapsed_ms: f64,
}

pub struct Scheduler;

impl Scheduler {
    /// Recalculates the entire project schedule and summary tasks.
    pub fn recalculate(data: &mut ProjectData) -> ScheduleResult {
        let start_time = Instant::now();

        // 1. Validate cycles in DAG
        if DependencyGraph::has_cycle(&data.tasks, &data.dependencies) {
            return ScheduleResult {
                success: false,
                error_message: Some("Dependencia circular detectada entre tareas. Corrige las dependencias.".to_string()),
                elapsed_ms: start_time.elapsed().as_secs_f64() * 1000.0,
            };
        }

        // 2. Setup calendar calculator
        let calc = CalendarCalculator::new(&data.calendar, &data.exceptions);

        // 3. Mark summary tasks and assign initial WBS
        WbsCalculator::update_wbs_codes(&mut data.tasks);

        // 4. Get topological sort order
        let order = match DependencyGraph::topological_order(&data.tasks, &data.dependencies) {
            Ok(ord) => ord,
            Err(e) => {
                return ScheduleResult {
                    success: false,
                    error_message: Some(e),
                    elapsed_ms: start_time.elapsed().as_secs_f64() * 1000.0,
                };
            }
        };

        // Map task id to index in vec
        let id_to_index: HashMap<i64, usize> = data
            .tasks
            .iter()
            .enumerate()
            .map(|(idx, t)| (t.id, idx))
            .collect();

        // Map task id to its incoming dependencies (predecessors)
        let mut incoming_deps: HashMap<i64, Vec<&Dependency>> = HashMap::new();
        for dep in &data.dependencies {
            incoming_deps.entry(dep.successor_id).or_default().push(dep);
        }

        // Base project start date
        let proj_start_dt = NaiveDateTime::parse_from_str(
            &data.meta.project_start_date,
            "%Y-%m-%dT%H:%M:%S",
        )
        .unwrap_or_else(|_| {
            chrono::Utc::now()
                .naive_utc()
                .date()
                .and_hms_opt(8, 0, 0)
                .unwrap()
        });

        let proj_start_normalized = calc.normalize_to_working_moment(proj_start_dt);

        match data.meta.schedule_from {
            ScheduleFrom::Start => {
                Self::schedule_forward(
                    &mut data.tasks,
                    &order,
                    &id_to_index,
                    &incoming_deps,
                    &calc,
                    proj_start_normalized,
                );
            }
            ScheduleFrom::Finish => {
                let proj_finish_dt = data
                    .meta
                    .project_finish_date
                    .as_deref()
                    .and_then(|s| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S").ok())
                    .unwrap_or(proj_start_normalized);

                Self::schedule_backward(
                    &mut data.tasks,
                    &order,
                    &id_to_index,
                    &data.dependencies,
                    &calc,
                    proj_finish_dt,
                );
            }
        }

        // 5. Update summary tasks (dates, duration and % complete)
        WbsCalculator::update_summary_tasks(&mut data.tasks, &calc);

        // 6. Update project finish date in metadata
        let mut max_finish: Option<NaiveDateTime> = None;
        for t in &data.tasks {
            if let Ok(f) = NaiveDateTime::parse_from_str(&t.finish_date, "%Y-%m-%dT%H:%M:%S") {
                max_finish = Some(match max_finish {
                    Some(cur) => cur.max(f),
                    None => f,
                });
            }
        }
        if let Some(mf) = max_finish {
            data.meta.project_finish_date = Some(mf.format("%Y-%m-%dT%H:%M:%S").to_string());
        }

        let elapsed = start_time.elapsed().as_secs_f64() * 1000.0;
        ScheduleResult {
            success: true,
            error_message: None,
            elapsed_ms: elapsed,
        }
    }

    fn schedule_forward(
        tasks: &mut [Task],
        order: &[i64],
        id_to_index: &HashMap<i64, usize>,
        incoming_deps: &HashMap<i64, Vec<&Dependency>>,
        calc: &CalendarCalculator,
        proj_start_dt: NaiveDateTime,
    ) {
        // Find which tasks are summary tasks: their dates are computed from their children
        let summary_ids: HashSet<i64> = tasks
            .iter()
            .filter(|t| t.is_summary)
            .map(|t| t.id)
            .collect();

        for &task_id in order {
            if summary_ids.contains(&task_id) {
                // Summary task dates are computed in step 5
                continue;
            }

            let task_idx = match id_to_index.get(&task_id) {
                Some(&i) => i,
                None => continue,
            };

            let mut earliest_start = proj_start_dt;

            // Check incoming dependencies
            if let Some(deps) = incoming_deps.get(&task_id) {
                for dep in deps {
                    let pred_idx = match id_to_index.get(&dep.predecessor_id) {
                        Some(&i) => i,
                        None => continue,
                    };
                    let pred = &tasks[pred_idx];

                    let pred_start = NaiveDateTime::parse_from_str(&pred.start_date, "%Y-%m-%dT%H:%M:%S")
                        .unwrap_or(proj_start_dt);
                    let pred_finish = NaiveDateTime::parse_from_str(&pred.finish_date, "%Y-%m-%dT%H:%M:%S")
                        .unwrap_or(proj_start_dt);

                    let req_start = match dep.dep_type {
                        DependencyType::FS => {
                            if dep.lag_hours >= 0.0 {
                                calc.add_working_hours(pred_finish, dep.lag_hours)
                            } else {
                                calc.subtract_working_hours(pred_finish, dep.lag_hours.abs())
                            }
                        }
                        DependencyType::SS => {
                            if dep.lag_hours >= 0.0 {
                                calc.add_working_hours(pred_start, dep.lag_hours)
                            } else {
                                calc.subtract_working_hours(pred_start, dep.lag_hours.abs())
                            }
                        }
                        DependencyType::FF => {
                            // finish >= pred_finish + lag => start = (pred_finish + lag) - duration
                            let target_finish = if dep.lag_hours >= 0.0 {
                                calc.add_working_hours(pred_finish, dep.lag_hours)
                            } else {
                                calc.subtract_working_hours(pred_finish, dep.lag_hours.abs())
                            };
                            calc.subtract_working_hours(target_finish, tasks[task_idx].duration_hours)
                        }
                        DependencyType::SF => {
                            // finish >= pred_start + lag => start = (pred_start + lag) - duration
                            let target_finish = if dep.lag_hours >= 0.0 {
                                calc.add_working_hours(pred_start, dep.lag_hours)
                            } else {
                                calc.subtract_working_hours(pred_start, dep.lag_hours.abs())
                            };
                            calc.subtract_working_hours(target_finish, tasks[task_idx].duration_hours)
                        }
                    };

                    earliest_start = earliest_start.max(req_start);
                }
            }

            // Apply constraints (e.g., SNET - Start No Earlier Than, MSO - Must Start On)
            if let Some(ref c_type) = tasks[task_idx].constraint_type {
                if let Some(ref c_date_str) = tasks[task_idx].constraint_date {
                    if let Ok(c_date) = NaiveDateTime::parse_from_str(c_date_str, "%Y-%m-%dT%H:%M:%S") {
                        match c_type.as_str() {
                            "SNET" => { // Start No Earlier Than
                                earliest_start = earliest_start.max(c_date);
                            }
                            "MSO" => { // Must Start On
                                earliest_start = c_date;
                            }
                            _ => {}
                        }
                    }
                }
            }

            let start_dt = calc.normalize_to_working_moment(earliest_start);
            let finish_dt = if tasks[task_idx].is_milestone || tasks[task_idx].duration_hours <= 0.0 {
                start_dt
            } else {
                calc.add_working_hours(start_dt, tasks[task_idx].duration_hours)
            };

            tasks[task_idx].start_date = start_dt.format("%Y-%m-%dT%H:%M:%S").to_string();
            tasks[task_idx].finish_date = finish_dt.format("%Y-%m-%dT%H:%M:%S").to_string();
        }
    }

    fn schedule_backward(
        tasks: &mut [Task],
        order: &[i64],
        id_to_index: &HashMap<i64, usize>,
        dependencies: &[Dependency],
        calc: &CalendarCalculator,
        proj_finish_dt: NaiveDateTime,
    ) {
        // Map predecessor to outgoing dependencies (successors)
        let mut outgoing_deps: HashMap<i64, Vec<&Dependency>> = HashMap::new();
        for dep in dependencies {
            outgoing_deps.entry(dep.predecessor_id).or_default().push(dep);
        }

        // Iterate in reverse topological order
        for &task_id in order.iter().rev() {
            let task_idx = match id_to_index.get(&task_id) {
                Some(&i) => i,
                None => continue,
            };

            if tasks[task_idx].is_summary {
                continue;
            }

            let mut latest_finish = proj_finish_dt;

            if let Some(deps) = outgoing_deps.get(&task_id) {
                for dep in deps {
                    let succ_idx = match id_to_index.get(&dep.successor_id) {
                        Some(&i) => i,
                        None => continue,
                    };
                    let succ = &tasks[succ_idx];

                    let succ_start = NaiveDateTime::parse_from_str(&succ.start_date, "%Y-%m-%dT%H:%M:%S")
                        .unwrap_or(proj_finish_dt);
                    let succ_finish = NaiveDateTime::parse_from_str(&succ.finish_date, "%Y-%m-%dT%H:%M:%S")
                        .unwrap_or(proj_finish_dt);

                    let req_finish = match dep.dep_type {
                        DependencyType::FS => {
                            // pred_finish <= succ_start - lag
                            if dep.lag_hours >= 0.0 {
                                calc.subtract_working_hours(succ_start, dep.lag_hours)
                            } else {
                                calc.add_working_hours(succ_start, dep.lag_hours.abs())
                            }
                        }
                        DependencyType::SS => {
                            // pred_start <= succ_start - lag => pred_finish = pred_start + duration
                            let target_start = if dep.lag_hours >= 0.0 {
                                calc.subtract_working_hours(succ_start, dep.lag_hours)
                            } else {
                                calc.add_working_hours(succ_start, dep.lag_hours.abs())
                            };
                            calc.add_working_hours(target_start, tasks[task_idx].duration_hours)
                        }
                        DependencyType::FF => {
                            // pred_finish <= succ_finish - lag
                            if dep.lag_hours >= 0.0 {
                                calc.subtract_working_hours(succ_finish, dep.lag_hours)
                            } else {
                                calc.add_working_hours(succ_finish, dep.lag_hours.abs())
                            }
                        }
                        DependencyType::SF => {
                            // pred_start <= succ_finish - lag => pred_finish = pred_start + duration
                            let target_start = if dep.lag_hours >= 0.0 {
                                calc.subtract_working_hours(succ_finish, dep.lag_hours)
                            } else {
                                calc.add_working_hours(succ_finish, dep.lag_hours.abs())
                            };
                            calc.add_working_hours(target_start, tasks[task_idx].duration_hours)
                        }
                    };

                    latest_finish = latest_finish.min(req_finish);
                }
            }

            // Apply constraints (e.g. FNLT - Finish No Later Than, MFO - Must Finish On)
            if let Some(ref c_type) = tasks[task_idx].constraint_type {
                if let Some(ref c_date_str) = tasks[task_idx].constraint_date {
                    if let Ok(c_date) = NaiveDateTime::parse_from_str(c_date_str, "%Y-%m-%dT%H:%M:%S") {
                        match c_type.as_str() {
                            "FNLT" => {
                                latest_finish = latest_finish.min(c_date);
                            }
                            "MFO" => {
                                latest_finish = c_date;
                            }
                            _ => {}
                        }
                    }
                }
            }

            let finish_dt = latest_finish;
            let start_dt = if tasks[task_idx].is_milestone || tasks[task_idx].duration_hours <= 0.0 {
                finish_dt
            } else {
                calc.subtract_working_hours(finish_dt, tasks[task_idx].duration_hours)
            };

            tasks[task_idx].start_date = start_dt.format("%Y-%m-%dT%H:%M:%S").to_string();
            tasks[task_idx].finish_date = finish_dt.format("%Y-%m-%dT%H:%M:%S").to_string();
        }
    }
}
