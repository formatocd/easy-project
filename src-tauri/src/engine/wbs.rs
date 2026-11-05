use crate::engine::calendar_calc::CalendarCalculator;
use crate::models::task::Task;
use chrono::NaiveDateTime;
use std::collections::{HashMap, HashSet};

pub struct WbsCalculator;

impl WbsCalculator {
    /// Recalculates WBS codes (1, 1.1, 1.2, 2, etc.) and is_summary flag based on parent_id and sort_order
    pub fn update_wbs_codes(tasks: &mut [Task]) {
        // Find set of all parents
        let parent_ids: HashSet<i64> = tasks
            .iter()
            .filter_map(|t| t.parent_id)
            .collect();

        // Update is_summary flag
        for task in tasks.iter_mut() {
            task.is_summary = parent_ids.contains(&task.id);
        }

        // Build tree: parent_id -> list of task indices
        let mut children_map: HashMap<Option<i64>, Vec<usize>> = HashMap::new();
        for (idx, task) in tasks.iter().enumerate() {
            children_map
                .entry(task.parent_id)
                .or_default()
                .push(idx);
        }

        // Sort children at each level by sort_order, then by id
        for list in children_map.values_mut() {
            list.sort_by_key(|&idx| (tasks[idx].sort_order, tasks[idx].id));
        }

        // Recursive assigner
        fn assign_codes(
            parent_id: Option<i64>,
            prefix: &str,
            children_map: &HashMap<Option<i64>, Vec<usize>>,
            tasks: &mut [Task],
        ) {
            if let Some(children) = children_map.get(&parent_id) {
                for (seq, &child_idx) in children.iter().enumerate() {
                    let number = seq + 1;
                    let wbs = if prefix.is_empty() {
                        format!("{}", number)
                    } else {
                        format!("{}.{}", prefix, number)
                    };

                    tasks[child_idx].wbs_code = wbs.clone();
                    let this_id = Some(tasks[child_idx].id);
                    assign_codes(this_id, &wbs, children_map, tasks);
                }
            }
        }

        assign_codes(None, "", &children_map, tasks);
    }

    /// Recalculates summary tasks from bottom-up (children -> parent)
    pub fn update_summary_tasks(tasks: &mut [Task], calc: &CalendarCalculator) {
        // Collect parent-child relationships
        let mut parent_to_children: HashMap<i64, Vec<i64>> = HashMap::new();
        for t in tasks.iter() {
            if let Some(pid) = t.parent_id {
                parent_to_children.entry(pid).or_default().push(t.id);
            }
        }

        // Find leaf tasks vs summary tasks
        let summary_ids: HashSet<i64> = parent_to_children.keys().copied().collect();
        if summary_ids.is_empty() {
            return;
        }

        // Iterate bottom-up (by WBS code depth descending)
        let mut summary_tasks_sorted: Vec<(i64, usize)> = tasks
            .iter()
            .filter(|t| summary_ids.contains(&t.id))
            .map(|t| (t.id, t.wbs_code.matches('.').count()))
            .collect();

        // Sort deepest first
        summary_tasks_sorted.sort_by(|a, b| b.1.cmp(&a.1));

        for (parent_id, _) in summary_tasks_sorted {
            let child_ids = match parent_to_children.get(&parent_id) {
                Some(ids) => ids.clone(),
                None => continue,
            };

            let mut min_start: Option<NaiveDateTime> = None;
            let mut max_finish: Option<NaiveDateTime> = None;
            let mut total_duration = 0.0;
            let mut weighted_progress = 0.0;
            let mut sum_child_pct = 0.0;
            let mut valid_children_count = 0;

            for &cid in &child_ids {
                if let Some(child) = tasks.iter().find(|t| t.id == cid) {
                    if let (Ok(s), Ok(f)) = (
                        NaiveDateTime::parse_from_str(&child.start_date, "%Y-%m-%dT%H:%M:%S"),
                        NaiveDateTime::parse_from_str(&child.finish_date, "%Y-%m-%dT%H:%M:%S"),
                    ) {
                        min_start = Some(match min_start {
                            Some(cur) => cur.min(s),
                            None => s,
                        });
                        max_finish = Some(match max_finish {
                            Some(cur) => cur.max(f),
                            None => f,
                        });

                        let child_dur = child.duration_hours.max(0.0);
                        total_duration += child_dur;
                        weighted_progress += child_dur * child.percent_complete;
                        sum_child_pct += child.percent_complete;
                        valid_children_count += 1;
                    }
                }
            }

            let computed_percent = if total_duration > 0.0 {
                ((weighted_progress / total_duration) * 100.0).round() / 100.0
            } else if valid_children_count > 0 {
                ((sum_child_pct / valid_children_count as f64) * 100.0).round() / 100.0
            } else {
                0.0
            };

            if let Some(parent) = tasks.iter_mut().find(|t| t.id == parent_id) {
                if let (Some(s), Some(f)) = (min_start, max_finish) {
                    parent.start_date = s.format("%Y-%m-%dT%H:%M:%S").to_string();
                    parent.finish_date = f.format("%Y-%m-%dT%H:%M:%S").to_string();
                    parent.duration_hours = calc.working_hours_between(s, f);
                    parent.percent_complete = computed_percent;
                }
            }
        }
    }
}
