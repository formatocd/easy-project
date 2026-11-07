use crate::engine::scheduler::Scheduler;
use crate::models::{
    dependency::{Dependency, DependencyType},
    state::{ProjectData, TaskDto},
    task::Task,
};
use crate::storage::{
    db::DbStorage,
    export_csv::CsvExporter,
    export_excel::ExcelExporter,
    import_mspdi::MspdiImporter,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectPayload {
    pub data: ProjectData,
    pub task_dtos: Vec<TaskDto>,
    pub can_undo: bool,
    pub can_redo: bool,
    pub calculation_ms: f64,
    pub active_task_id: Option<i64>,
}

pub struct AppState {
    pub current: Mutex<ProjectData>,
    pub undo_stack: Mutex<Vec<ProjectData>>,
    pub redo_stack: Mutex<Vec<ProjectData>>,
}

impl AppState {
    pub fn new() -> Self {
        let mut initial = ProjectData::default();
        Scheduler::recalculate(&mut initial);
        Self {
            current: Mutex::new(initial),
            undo_stack: Mutex::new(Vec::new()),
            redo_stack: Mutex::new(Vec::new()),
        }
    }

    pub fn push_undo(&self, current_data: &ProjectData) {
        let mut undo = self.undo_stack.lock().unwrap();
        undo.push(current_data.clone());
        if undo.len() > 100 {
            undo.remove(0);
        }
        let mut redo = self.redo_stack.lock().unwrap();
        redo.clear();
    }
}

pub fn build_payload(data: &ProjectData, can_undo: bool, can_redo: bool, ms: f64) -> ProjectPayload {
    build_payload_with_active(data, can_undo, can_redo, ms, None)
}

pub fn build_payload_with_active(
    data: &ProjectData,
    can_undo: bool,
    can_redo: bool,
    ms: f64,
    active_task_id: Option<i64>,
) -> ProjectPayload {
    let mut task_dtos = Vec::with_capacity(data.tasks.len());

    let mut id_to_parent: HashMap<i64, Option<i64>> = HashMap::new();
    let mut parent_ids: HashSet<i64> = HashSet::new();
    for t in &data.tasks {
        id_to_parent.insert(t.id, t.parent_id);
        if let Some(pid) = t.parent_id {
            parent_ids.insert(pid);
        }
    }

    let mut incoming_deps: HashMap<i64, Vec<&Dependency>> = HashMap::new();
    for dep in &data.dependencies {
        incoming_deps.entry(dep.successor_id).or_default().push(dep);
    }

    for task in &data.tasks {
        let mut depth = 0;
        let mut curr_pid = task.parent_id;
        while let Some(pid) = curr_pid {
            depth += 1;
            curr_pid = id_to_parent.get(&pid).copied().flatten();
            if depth > 50 {
                break;
            }
        }

        let predecessors_display = if let Some(deps) = incoming_deps.get(&task.id) {
            deps.iter()
                .map(|d| d.to_shorthand(data.meta.hours_per_day))
                .collect::<Vec<_>>()
                .join(", ")
        } else {
            String::new()
        };

        task_dtos.push(TaskDto {
            task: task.clone(),
            predecessors_display,
            depth,
            has_children: parent_ids.contains(&task.id),
        });
    }

    ProjectPayload {
        data: data.clone(),
        task_dtos,
        can_undo,
        can_redo,
        calculation_ms: ms,
        active_task_id,
    }
}

#[tauri::command]
pub fn get_project(state: State<AppState>) -> Result<ProjectPayload, String> {
    let data = state.current.lock().unwrap();
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, 0.0))
}

#[tauri::command]
pub fn new_project(state: State<AppState>, name: Option<String>) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    let mut new_data = ProjectData::default();
    if let Some(n) = name {
        new_data.meta.name = n;
    }
    let res = Scheduler::recalculate(&mut new_data);
    *data = new_data;

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn open_project_file(state: State<AppState>, path: String) -> Result<ProjectPayload, String> {
    let conn = DbStorage::open_or_create(&path)
        .map_err(|e| format!("Error al abrir archivo SQLite: {}", e))?;
    let mut loaded = DbStorage::load_project(&conn, Some(path))
        .map_err(|e| format!("Error al leer proyecto: {}", e))?;

    let res = Scheduler::recalculate(&mut loaded);
    if !res.success {
        return Err(res.error_message.unwrap_or_else(|| "Error de cálculo".into()));
    }

    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);
    *data = loaded;

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn save_project_file(state: State<AppState>, target_path: Option<String>) -> Result<String, String> {
    let mut data = state.current.lock().unwrap();
    let save_path = match target_path {
        Some(p) => p,
        None => match data.file_path.clone() {
            Some(p) => p,
            None => return Err("Ruta de archivo no especificada para guardar.".to_string()),
        },
    };

    let mut conn = DbStorage::open_or_create(&save_path)
        .map_err(|e| format!("Error al preparar archivo SQLite: {}", e))?;
    DbStorage::save_project(&mut conn, &data)
        .map_err(|e| format!("Error al guardar proyecto: {}", e))?;

    data.file_path = Some(save_path.clone());
    Ok(save_path)
}

#[tauri::command]
pub fn export_project_csv(state: State<AppState>, path: String) -> Result<String, String> {
    let data = state.current.lock().unwrap();
    CsvExporter::export_to_file(&data, &path)?;
    Ok(path)
}

#[tauri::command]
pub fn export_project_excel(state: State<AppState>, path: String) -> Result<String, String> {
    let data = state.current.lock().unwrap();
    ExcelExporter::export_to_file(&data, &path)?;
    Ok(path)
}

#[tauri::command]
pub fn import_project_xml(state: State<AppState>, path: String) -> Result<ProjectPayload, String> {
    let imported = MspdiImporter::import_from_file(&path)?;
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);
    *data = imported;

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, 0.0))
}

#[tauri::command]
pub fn update_calendar(
    state: State<AppState>,
    calendar: crate::models::calendar::Calendar,
    exceptions: Vec<crate::models::calendar::CalendarException>,
) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    data.calendar = calendar;
    data.exceptions = exceptions;

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}

#[tauri::command]
pub fn update_project_meta(
    state: State<AppState>,
    meta: crate::models::project::ProjectMeta,
) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    data.meta = meta;

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn update_task(state: State<AppState>, updated: Task) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    if let Some(idx) = data.tasks.iter().position(|t| t.id == updated.id) {
        data.tasks[idx] = updated;
    }

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn add_task(
    state: State<AppState>,
    after_id: Option<i64>,
    name: Option<String>,
) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    let next_id = data.tasks.iter().map(|t| t.id).max().unwrap_or(0) + 1;
    let mut insert_idx = data.tasks.len();

    if let Some(aid) = after_id {
        if let Some(pos) = data.tasks.iter().position(|t| t.id == aid) {
            insert_idx = pos + 1;
        }
    }

    let parent_id = if insert_idx > 0 && insert_idx <= data.tasks.len() {
        let prev = &data.tasks[insert_idx - 1];
        if prev.is_summary {
            Some(prev.id)
        } else {
            prev.parent_id
        }
    } else {
        None
    };

    let new_task = Task {
        id: next_id,
        parent_id,
        wbs_code: "".to_string(),
        sort_order: (insert_idx + 1) as i32,
        name: name.unwrap_or_else(|| format!("Tarea {}", next_id)),
        duration_hours: 8.0,
        start_date: data.meta.project_start_date.clone(),
        finish_date: data.meta.project_start_date.clone(),
        constraint_type: None,
        constraint_date: None,
        percent_complete: 0.0,
        is_milestone: false,
        is_summary: false,
        baseline_start: None,
        baseline_finish: None,
        baseline_duration_hours: None,
        notes: None,
    };

    data.tasks.insert(insert_idx, new_task);

    // Normalize all sort_orders and IDs to strictly correlative 1..=len
    renumber_tasks(&mut data);
    let new_task_id = (insert_idx + 1) as i64;

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload_with_active(&data, can_undo, can_redo, res.elapsed_ms, Some(new_task_id)))
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTaskInput {
    pub name: String,
    pub duration_hours: Option<f64>,
}

#[tauri::command]
pub fn add_tasks_batch(
    state: State<AppState>,
    tasks: Vec<NewTaskInput>,
    after_id: Option<i64>,
) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    let mut start_sort_order = match after_id {
        Some(aid) => {
            if let Some(prev) = data.tasks.iter().find(|t| t.id == aid) {
                prev.sort_order + 1
            } else {
                data.tasks.iter().map(|t| t.sort_order).max().unwrap_or(0) + 1
            }
        }
        None => data.tasks.iter().map(|t| t.sort_order).max().unwrap_or(0) + 1,
    };

    let count = tasks.len() as i32;
    for t in data.tasks.iter_mut() {
        if t.sort_order >= start_sort_order {
            t.sort_order += count;
        }
    }

    let mut next_id = data.tasks.iter().map(|t| t.id).max().unwrap_or(0) + 1;
    let insert_idx = match after_id {
        Some(aid) => data.tasks.iter().position(|t| t.id == aid).map(|p| p + 1).unwrap_or(data.tasks.len()),
        None => data.tasks.len(),
    };

    let parent_id = if insert_idx > 0 && insert_idx <= data.tasks.len() {
        let prev = &data.tasks[insert_idx - 1];
        if prev.is_summary {
            Some(prev.id)
        } else {
            prev.parent_id
        }
    } else {
        None
    };

    for input in tasks {
        let trimmed_name = input.name.trim();
        if trimmed_name.is_empty() {
            continue;
        }

        let duration = input.duration_hours.unwrap_or(data.meta.hours_per_day);
        let is_milestone = duration == 0.0;

        let new_task = Task {
            id: next_id,
            parent_id,
            wbs_code: "".to_string(),
            sort_order: start_sort_order,
            name: trimmed_name.to_string(),
            duration_hours: duration,
            start_date: data.meta.project_start_date.clone(),
            finish_date: data.meta.project_start_date.clone(),
            constraint_type: None,
            constraint_date: None,
            percent_complete: 0.0,
            is_milestone,
            is_summary: false,
            baseline_start: None,
            baseline_finish: None,
            baseline_duration_hours: None,
            notes: None,
        };

        data.tasks.push(new_task);
        next_id += 1;
        start_sort_order += 1;
    }

    data.tasks.sort_by_key(|t| (t.sort_order, t.id));
    for (idx, t) in data.tasks.iter_mut().enumerate() {
        t.sort_order = (idx + 1) as i32;
    }

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn delete_task(state: State<AppState>, task_id: i64) -> Result<ProjectPayload, String> {
    delete_tasks(state, vec![task_id])
}

#[tauri::command]
pub fn delete_tasks(state: State<AppState>, task_ids: Vec<i64>) -> Result<ProjectPayload, String> {
    if task_ids.is_empty() {
        return get_project(state);
    }
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    let mut to_delete: HashSet<i64> = task_ids.into_iter().collect();

    let mut changed = true;
    while changed {
        changed = false;
        for t in &data.tasks {
            if let Some(pid) = t.parent_id {
                if to_delete.contains(&pid) && !to_delete.contains(&t.id) {
                    to_delete.insert(t.id);
                    changed = true;
                }
            }
        }
    }

    data.tasks.retain(|t| !to_delete.contains(&t.id));
    data.dependencies
        .retain(|d| !to_delete.contains(&d.predecessor_id) && !to_delete.contains(&d.successor_id));

    // Normalize sort order and IDs after deletion
    data.tasks.sort_by_key(|t| (t.sort_order, t.id));
    renumber_tasks(&mut data);

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn indent_task(state: State<AppState>, task_id: i64) -> Result<ProjectPayload, String> {
    indent_tasks(state, vec![task_id])
}

#[tauri::command]
pub fn indent_tasks(state: State<AppState>, task_ids: Vec<i64>) -> Result<ProjectPayload, String> {
    if task_ids.is_empty() {
        return get_project(state);
    }
    let mut data = state.current.lock().unwrap();

    // Preserve the visual ordering of tasks
    let sorted_ids: Vec<i64> = data
        .tasks
        .iter()
        .filter(|t| task_ids.contains(&t.id))
        .map(|t| t.id)
        .collect();

    if sorted_ids.is_empty() {
        return Err("No se encontraron las tareas".into());
    }

    let first_id = sorted_ids[0];
    let first_idx = match data.tasks.iter().position(|t| t.id == first_id) {
        Some(i) => i,
        None => return Err("Tarea no encontrada".into()),
    };

    if first_idx == 0 {
        return Err("La primera tarea no puede ser indentada".into());
    }

    state.push_undo(&data);
    let first_parent = data.tasks[first_idx].parent_id;

    // Target parent is the preceding sibling at the same level, or the immediate previous task
    let mut new_parent_id = None;
    for prev in data.tasks[..first_idx].iter().rev() {
        if prev.parent_id == first_parent {
            new_parent_id = Some(prev.id);
            break;
        }
    }

    let target_parent = match new_parent_id {
        Some(pid) => pid,
        None => data.tasks[first_idx - 1].id,
    };

    let id_set: HashSet<i64> = sorted_ids.into_iter().collect();
    for t in data.tasks.iter_mut() {
        if id_set.contains(&t.id) {
            t.parent_id = Some(target_parent);
        }
    }

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn outdent_task(state: State<AppState>, task_id: i64) -> Result<ProjectPayload, String> {
    outdent_tasks(state, vec![task_id])
}

#[tauri::command]
pub fn outdent_tasks(state: State<AppState>, task_ids: Vec<i64>) -> Result<ProjectPayload, String> {
    if task_ids.is_empty() {
        return get_project(state);
    }
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    let parent_map: HashMap<i64, Option<i64>> =
        data.tasks.iter().map(|t| (t.id, t.parent_id)).collect();

    let id_set: HashSet<i64> = task_ids.into_iter().collect();
    let mut outdented_info: Vec<(i64, usize, Option<i64>)> = Vec::new();

    for (idx, t) in data.tasks.iter_mut().enumerate() {
        if id_set.contains(&t.id) {
            if let Some(pid) = t.parent_id {
                let old_pid = t.parent_id;
                let grandparent = parent_map.get(&pid).copied().flatten();
                t.parent_id = grandparent;
                outdented_info.push((t.id, idx, old_pid));
            }
        }
    }

    // When a task is outdented, any unselected siblings immediately following it
    // preserve their indentation by becoming children of the outdented task
    for (outdented_id, outdented_idx, old_pid) in outdented_info {
        if old_pid.is_none() {
            continue;
        }
        for k in (outdented_idx + 1)..data.tasks.len() {
            if id_set.contains(&data.tasks[k].id) {
                break;
            }
            if data.tasks[k].parent_id == old_pid {
                data.tasks[k].parent_id = Some(outdented_id);
            } else {
                let curr_pid = data.tasks[k].parent_id;
                let is_descendant = curr_pid == Some(outdented_id) || {
                    let mut curr = curr_pid;
                    let mut found = false;
                    while let Some(p) = curr {
                        if p == outdented_id {
                            found = true;
                            break;
                        }
                        curr = parent_map.get(&p).copied().flatten();
                    }
                    found
                };
                if !is_descendant {
                    break;
                }
            }
        }
    }

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}

fn get_task_family_block(tasks: &[Task], root_id: i64) -> (usize, usize) {
    let mut family_ids = HashSet::new();
    family_ids.insert(root_id);

    let mut changed = true;
    while changed {
        changed = false;
        for t in tasks {
            if let Some(pid) = t.parent_id {
                if family_ids.contains(&pid) && !family_ids.contains(&t.id) {
                    family_ids.insert(t.id);
                    changed = true;
                }
            }
        }
    }

    let indices: Vec<usize> = tasks
        .iter()
        .enumerate()
        .filter(|(_, t)| family_ids.contains(&t.id))
        .map(|(i, _)| i)
        .collect();

    if indices.is_empty() {
        (0, 0)
    } else {
        (indices[0], indices[indices.len() - 1])
    }
}

fn get_task_depth(tasks: &[Task], task_id: i64) -> usize {
    let id_to_parent: HashMap<i64, Option<i64>> = tasks.iter().map(|t| (t.id, t.parent_id)).collect();
    let mut depth = 0;
    let mut curr = id_to_parent.get(&task_id).copied().flatten();
    while let Some(pid) = curr {
        depth += 1;
        curr = id_to_parent.get(&pid).copied().flatten();
        if depth > 50 {
            break;
        }
    }
    depth
}

fn renumber_tasks(data: &mut ProjectData) -> HashMap<i64, i64> {
    let mut old_to_new: HashMap<i64, i64> = HashMap::new();
    for (idx, task) in data.tasks.iter().enumerate() {
        let new_id = (idx + 1) as i64;
        old_to_new.insert(task.id, new_id);
    }

    for (idx, task) in data.tasks.iter_mut().enumerate() {
        let new_id = (idx + 1) as i64;
        task.id = new_id;
        task.sort_order = (idx + 1) as i32;
        if let Some(pid) = task.parent_id {
            task.parent_id = old_to_new.get(&pid).copied();
        }
    }

    for dep in data.dependencies.iter_mut() {
        if let Some(&new_pred) = old_to_new.get(&dep.predecessor_id) {
            dep.predecessor_id = new_pred;
        }
        if let Some(&new_succ) = old_to_new.get(&dep.successor_id) {
            dep.successor_id = new_succ;
        }
    }

    old_to_new
}

#[tauri::command]
pub fn move_task_up(state: State<AppState>, task_id: i64) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();

    let (start_idx, end_idx) = get_task_family_block(&data.tasks, task_id);
    if start_idx == 0 || end_idx >= data.tasks.len() {
        let can_undo = !state.undo_stack.lock().unwrap().is_empty();
        let can_redo = !state.redo_stack.lock().unwrap().is_empty();
        return Ok(build_payload(&data, can_undo, can_redo, 0.0));
    }

    let target_depth = get_task_depth(&data.tasks, task_id);

    // Look backwards for a task with depth == target_depth (same level)
    // OR depth == target_depth - 1 (immediate superior level / container)
    let mut prev_target_idx = None;
    for i in (0..start_idx).rev() {
        let d = get_task_depth(&data.tasks, data.tasks[i].id);
        if d == target_depth || (target_depth > 0 && d == target_depth - 1) {
            prev_target_idx = Some(i);
            break;
        }
    }

    let prev_idx = match prev_target_idx {
        Some(idx) => idx,
        None => {
            let can_undo = !state.undo_stack.lock().unwrap().is_empty();
            let can_redo = !state.redo_stack.lock().unwrap().is_empty();
            return Ok(build_payload(&data, can_undo, can_redo, 0.0));
        }
    };

    let prev_d = get_task_depth(&data.tasks, data.tasks[prev_idx].id);

    // If prev_idx is at immediate superior level and at index 0, we cannot move above the root of the project!
    if prev_d < target_depth && prev_idx == 0 {
        let can_undo = !state.undo_stack.lock().unwrap().is_empty();
        let can_redo = !state.redo_stack.lock().unwrap().is_empty();
        return Ok(build_payload(&data, can_undo, can_redo, 0.0));
    }

    state.push_undo(&data);

    let prev_task = &data.tasks[prev_idx];
    let (insert_idx, new_parent_id) = if prev_d == target_depth {
        if prev_task.parent_id == data.tasks[start_idx].parent_id {
            // Sibling: move before prev_task's family block
            (prev_idx, data.tasks[start_idx].parent_id)
        } else {
            // Last task of same depth in previous parent: insert after that family
            let (_, prev_family_end) = get_task_family_block(&data.tasks, prev_task.id);
            (prev_family_end + 1, prev_task.parent_id)
        }
    } else {
        // prev_d == target_depth - 1 (Crossing upward out of current parent)
        // Move before prev_idx (the container) into the section above it
        let superior_neighbor = &data.tasks[prev_idx - 1];
        let superior_neighbor_d = get_task_depth(&data.tasks, superior_neighbor.id);
        let adopted_parent = if superior_neighbor_d == target_depth {
            superior_neighbor.parent_id
        } else {
            Some(superior_neighbor.id)
        };
        (prev_idx, adopted_parent)
    };

    let family_len = end_idx - start_idx + 1;
    let mut family_tasks = Vec::with_capacity(family_len);
    for _ in 0..family_len {
        family_tasks.push(data.tasks.remove(start_idx));
    }
    family_tasks[0].parent_id = new_parent_id;

    for (offset, t) in family_tasks.into_iter().enumerate() {
        data.tasks.insert(insert_idx + offset, t);
    }

    renumber_tasks(&mut data);
    let new_active_id = (insert_idx + 1) as i64;

    crate::engine::wbs::WbsCalculator::repair_hierarchy(&mut data.tasks);

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload_with_active(&data, can_undo, can_redo, res.elapsed_ms, Some(new_active_id)))
}

#[tauri::command]
pub fn move_task_down(state: State<AppState>, task_id: i64) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();

    let (start_idx, end_idx) = get_task_family_block(&data.tasks, task_id);
    if end_idx + 1 >= data.tasks.len() {
        let can_undo = !state.undo_stack.lock().unwrap().is_empty();
        let can_redo = !state.redo_stack.lock().unwrap().is_empty();
        return Ok(build_payload(&data, can_undo, can_redo, 0.0));
    }

    let target_depth = get_task_depth(&data.tasks, task_id);

    // Look forwards for a task with depth == target_depth (same level)
    // OR depth == target_depth - 1 (immediate superior level / container)
    let mut next_target_idx = None;
    for i in (end_idx + 1)..data.tasks.len() {
        let d = get_task_depth(&data.tasks, data.tasks[i].id);
        if d == target_depth || (target_depth > 0 && d == target_depth - 1) {
            next_target_idx = Some(i);
            break;
        }
    }

    let next_idx = match next_target_idx {
        Some(idx) => idx,
        None => {
            let can_undo = !state.undo_stack.lock().unwrap().is_empty();
            let can_redo = !state.redo_stack.lock().unwrap().is_empty();
            return Ok(build_payload(&data, can_undo, can_redo, 0.0));
        }
    };

    state.push_undo(&data);

    let next_task = &data.tasks[next_idx];
    let next_d = get_task_depth(&data.tasks, next_task.id);
    let family_len = end_idx - start_idx + 1;

    let (insert_idx, new_parent_id) = if next_d == target_depth {
        if next_task.parent_id == data.tasks[start_idx].parent_id {
            // Sibling: move after next_task's family block
            let (_, next_family_end) = get_task_family_block(&data.tasks, next_task.id);
            (next_family_end - family_len + 1, data.tasks[start_idx].parent_id)
        } else {
            // Crossing into next parent: insert right before next_task
            (next_idx - family_len, next_task.parent_id)
        }
    } else {
        // next_d == target_depth - 1 (Crossing downward into the next section container)
        // Insert right after next_task as its child
        let shifted_next_idx = next_idx - family_len;
        (shifted_next_idx + 1, Some(next_task.id))
    };

    let mut family_tasks = Vec::with_capacity(family_len);
    for _ in 0..family_len {
        family_tasks.push(data.tasks.remove(start_idx));
    }
    family_tasks[0].parent_id = new_parent_id;

    for (offset, t) in family_tasks.into_iter().enumerate() {
        data.tasks.insert(insert_idx + offset, t);
    }

    renumber_tasks(&mut data);
    let new_active_id = (insert_idx + 1) as i64;

    crate::engine::wbs::WbsCalculator::repair_hierarchy(&mut data.tasks);

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload_with_active(&data, can_undo, can_redo, res.elapsed_ms, Some(new_active_id)))
}

#[tauri::command]
pub fn move_task_to(
    state: State<AppState>,
    source_id: i64,
    target_id: i64,
) -> Result<ProjectPayload, String> {
    if source_id == target_id {
        return get_project(state);
    }

    let mut data = state.current.lock().unwrap();

    let (src_start, src_end) = get_task_family_block(&data.tasks, source_id);
    let src_depth = get_task_depth(&data.tasks, source_id);

    let target_idx = match data.tasks.iter().position(|t| t.id == target_id) {
        Some(idx) => idx,
        None => {
            let can_undo = !state.undo_stack.lock().unwrap().is_empty();
            let can_redo = !state.redo_stack.lock().unwrap().is_empty();
            return Ok(build_payload(&data, can_undo, can_redo, 0.0));
        }
    };

    let tgt_depth = get_task_depth(&data.tasks, target_id);
    let is_valid_drop = src_depth == tgt_depth || (src_depth > 0 && tgt_depth == src_depth - 1);
    if !is_valid_drop {
        let can_undo = !state.undo_stack.lock().unwrap().is_empty();
        let can_redo = !state.redo_stack.lock().unwrap().is_empty();
        return Ok(build_payload(&data, can_undo, can_redo, 0.0));
    }

    state.push_undo(&data);

    let target_task = &data.tasks[target_idx];
    let new_parent_id = if tgt_depth == src_depth {
        target_task.parent_id
    } else {
        Some(target_task.id)
    };

    let family_len = src_end - src_start + 1;
    let mut family_tasks = Vec::with_capacity(family_len);
    for _ in 0..family_len {
        family_tasks.push(data.tasks.remove(src_start));
    }
    family_tasks[0].parent_id = new_parent_id;

    let new_target_idx = data.tasks.iter().position(|t| t.id == target_id).unwrap();

    let insert_idx = if src_start < new_target_idx {
        let (_, tgt_family_end) = get_task_family_block(&data.tasks, target_id);
        (tgt_family_end + 1).min(data.tasks.len())
    } else {
        new_target_idx
    };

    for (offset, t) in family_tasks.into_iter().enumerate() {
        data.tasks.insert(insert_idx + offset, t);
    }

    renumber_tasks(&mut data);
    let new_active_id = (insert_idx + 1) as i64;

    crate::engine::wbs::WbsCalculator::repair_hierarchy(&mut data.tasks);

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload_with_active(&data, can_undo, can_redo, res.elapsed_ms, Some(new_active_id)))
}


#[tauri::command]
pub fn set_tasks_duration(
    state: State<AppState>,
    task_ids: Vec<i64>,
    duration_hours: f64,
) -> Result<ProjectPayload, String> {
    if task_ids.is_empty() {
        return get_project(state);
    }
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    let id_set: HashSet<i64> = task_ids.into_iter().collect();
    for t in data.tasks.iter_mut() {
        if id_set.contains(&t.id) && !t.is_summary {
            t.duration_hours = duration_hours;
            t.is_milestone = duration_hours == 0.0;
        }
    }

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn set_task_predecessors(
    state: State<AppState>,
    task_id: i64,
    expr: String,
) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    data.dependencies.retain(|d| d.successor_id != task_id);

    let new_deps = Dependency::parse_shorthand_list(task_id, &expr, data.meta.hours_per_day);
    for dep in new_deps {
        if data.tasks.iter().any(|t| t.id == dep.predecessor_id) {
            data.dependencies.push(dep);
        }
    }

    let res = Scheduler::recalculate(&mut data);
    if !res.success {
        let mut undo = state.undo_stack.lock().unwrap();
        if let Some(prev) = undo.pop() {
            *data = prev;
        }
        return Err(res.error_message.unwrap_or_else(|| "Error al asignar dependencias".into()));
    }

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn add_dependency(
    state: State<AppState>,
    pred_id: i64,
    succ_id: i64,
    dep_type: Option<String>,
    lag_hours: Option<f64>,
) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    if pred_id == succ_id {
        return Err("Una tarea no puede depender de sí misma".into());
    }

    state.push_undo(&data);

    let dt = match dep_type.as_deref() {
        Some(t) => DependencyType::from_str(t),
        None => DependencyType::FS,
    };

    data.dependencies
        .retain(|d| !(d.predecessor_id == pred_id && d.successor_id == succ_id));

    data.dependencies.push(Dependency {
        id: uuid::Uuid::new_v4().to_string(),
        predecessor_id: pred_id,
        successor_id: succ_id,
        dep_type: dt,
        lag_hours: lag_hours.unwrap_or(0.0),
    });

    let res = Scheduler::recalculate(&mut data);
    if !res.success {
        let mut undo = state.undo_stack.lock().unwrap();
        if let Some(prev) = undo.pop() {
            *data = prev;
        }
        return Err(res.error_message.unwrap_or_else(|| "Dependencia circular detectada".into()));
    }

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn remove_dependency(state: State<AppState>, dep_id: String) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    data.dependencies.retain(|d| d.id != dep_id);

    let res = Scheduler::recalculate(&mut data);
    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, res.elapsed_ms))
}


#[tauri::command]
pub fn save_baseline(state: State<AppState>) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    for t in data.tasks.iter_mut() {
        t.baseline_start = Some(t.start_date.clone());
        t.baseline_finish = Some(t.finish_date.clone());
        t.baseline_duration_hours = Some(t.duration_hours);
    }

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, 0.0))
}

#[tauri::command]
pub fn clear_baseline(state: State<AppState>) -> Result<ProjectPayload, String> {
    let mut data = state.current.lock().unwrap();
    state.push_undo(&data);

    for t in data.tasks.iter_mut() {
        t.baseline_start = None;
        t.baseline_finish = None;
        t.baseline_duration_hours = None;
    }

    let can_undo = !state.undo_stack.lock().unwrap().is_empty();
    let can_redo = !state.redo_stack.lock().unwrap().is_empty();
    Ok(build_payload(&data, can_undo, can_redo, 0.0))
}

#[tauri::command]
pub fn undo(state: State<AppState>) -> Result<ProjectPayload, String> {
    let mut undo_stack = state.undo_stack.lock().unwrap();
    let prev = match undo_stack.pop() {
        Some(p) => p,
        None => return Err("No hay acciones para deshacer".into()),
    };

    let mut current = state.current.lock().unwrap();
    let mut redo_stack = state.redo_stack.lock().unwrap();
    redo_stack.push(current.clone());
    *current = prev;

    let can_undo = !undo_stack.is_empty();
    let can_redo = !redo_stack.is_empty();
    Ok(build_payload(&current, can_undo, can_redo, 0.0))
}

#[tauri::command]
pub fn redo(state: State<AppState>) -> Result<ProjectPayload, String> {
    let mut redo_stack = state.redo_stack.lock().unwrap();
    let next = match redo_stack.pop() {
        Some(n) => n,
        None => return Err("No hay acciones para rehacer".into()),
    };

    let mut current = state.current.lock().unwrap();
    let mut undo_stack = state.undo_stack.lock().unwrap();
    undo_stack.push(current.clone());
    *current = next;

    let can_undo = !undo_stack.is_empty();
    let can_redo = !redo_stack.is_empty();
    Ok(build_payload(&current, can_undo, can_redo, 0.0))
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InitialConfig {
    pub language: Option<String>,
    pub theme: Option<String>,
}

#[tauri::command]
pub fn get_initial_config(app: tauri::AppHandle) -> InitialConfig {
    use tauri::Manager;

    // 1. Try application executable folder (INSTDIR)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let path = parent.join("initial_config.json");
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(cfg) = serde_json::from_str::<InitialConfig>(&content) {
                        return cfg;
                    }
                }
            }
        }
    }

    // 2. Try AppConfig / AppData roaming dir
    if let Ok(app_dir) = app.path().app_config_dir() {
        let path = app_dir.join("initial_config.json");
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(cfg) = serde_json::from_str::<InitialConfig>(&content) {
                    return cfg;
                }
            }
        }
    }

    InitialConfig::default()
}

#[tauri::command]
pub fn set_window_title(window: tauri::Window, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn force_close_window(app: tauri::AppHandle) {
    app.exit(0);
}
