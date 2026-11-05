use crate::models::{
    calendar::{Calendar, CalendarException},
    dependency::{Dependency, DependencyType},
    project::{ProjectMeta, ScheduleFrom},
    state::ProjectData,
    task::Task,
};
use rusqlite::{params, Connection, Result};
use std::path::Path;

pub struct DbStorage;

impl DbStorage {
    pub fn open_or_create<P: AsRef<Path>>(path: P) -> Result<Connection> {
        let conn = Connection::open(path)?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;",
        )?;
        Self::init_schema(&conn)?;
        Ok(conn)
    }

    pub fn init_schema(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS project_meta (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                schedule_from TEXT NOT NULL DEFAULT 'START',
                project_start_date TEXT NOT NULL,
                project_finish_date TEXT,
                hours_per_day REAL NOT NULL DEFAULT 8.0,
                hours_per_week REAL NOT NULL DEFAULT 40.0,
                days_per_month REAL NOT NULL DEFAULT 20.0,
                currency_symbol TEXT NOT NULL DEFAULT '€',
                schema_version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS calendars (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                is_default INTEGER NOT NULL DEFAULT 1,
                mon_hours REAL NOT NULL DEFAULT 8.0,
                tue_hours REAL NOT NULL DEFAULT 8.0,
                wed_hours REAL NOT NULL DEFAULT 8.0,
                thu_hours REAL NOT NULL DEFAULT 8.0,
                fri_hours REAL NOT NULL DEFAULT 8.0,
                sat_hours REAL NOT NULL DEFAULT 0.0,
                sun_hours REAL NOT NULL DEFAULT 0.0
            );

            CREATE TABLE IF NOT EXISTS calendar_exceptions (
                id TEXT PRIMARY KEY,
                calendar_id TEXT NOT NULL,
                exception_date TEXT NOT NULL,
                is_working INTEGER NOT NULL DEFAULT 0,
                working_hours REAL NOT NULL DEFAULT 0.0,
                description TEXT,
                FOREIGN KEY(calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY,
                parent_id INTEGER,
                wbs_code TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0,
                name TEXT NOT NULL,
                duration_hours REAL NOT NULL DEFAULT 8.0,
                start_date TEXT NOT NULL,
                finish_date TEXT NOT NULL,
                constraint_type TEXT,
                constraint_date TEXT,
                percent_complete REAL NOT NULL DEFAULT 0.0,
                is_milestone INTEGER NOT NULL DEFAULT 0,
                is_summary INTEGER NOT NULL DEFAULT 0,
                baseline_start TEXT,
                baseline_finish TEXT,
                baseline_duration_hours REAL,
                notes TEXT,
                FOREIGN KEY(parent_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS dependencies (
                id TEXT PRIMARY KEY,
                predecessor_id INTEGER NOT NULL,
                successor_id INTEGER NOT NULL,
                dep_type TEXT NOT NULL DEFAULT 'FS',
                lag_hours REAL NOT NULL DEFAULT 0.0,
                FOREIGN KEY(predecessor_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY(successor_id) REFERENCES tasks(id) ON DELETE CASCADE
            );

            -- Tablas reservadas para Fase 2 (Recursos y Costes)
            CREATE TABLE IF NOT EXISTS resources (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'WORK',
                max_units REAL NOT NULL DEFAULT 1.0,
                standard_rate REAL NOT NULL DEFAULT 0.0,
                overtime_rate REAL NOT NULL DEFAULT 0.0,
                cost_per_use REAL NOT NULL DEFAULT 0.0,
                accrue_at TEXT NOT NULL DEFAULT 'PRORATED',
                calendar_id TEXT
            );

            CREATE TABLE IF NOT EXISTS task_assignments (
                id TEXT PRIMARY KEY,
                task_id INTEGER NOT NULL,
                resource_id TEXT NOT NULL,
                units REAL NOT NULL DEFAULT 1.0,
                planned_work_hours REAL NOT NULL DEFAULT 0.0,
                actual_work_hours REAL NOT NULL DEFAULT 0.0,
                remaining_work_hours REAL NOT NULL DEFAULT 0.0,
                planned_cost REAL NOT NULL DEFAULT 0.0,
                actual_cost REAL NOT NULL DEFAULT 0.0,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
            );
            ",
        )?;
        Ok(())
    }

    pub fn save_project(conn: &mut Connection, data: &ProjectData) -> Result<()> {
        let tx = conn.transaction()?;

        // Clean existing MVP data
        tx.execute("DELETE FROM dependencies;", [])?;
        tx.execute("DELETE FROM tasks;", [])?;
        tx.execute("DELETE FROM calendar_exceptions;", [])?;
        tx.execute("DELETE FROM calendars;", [])?;
        tx.execute("DELETE FROM project_meta;", [])?;

        // 1. Meta
        tx.execute(
            "INSERT INTO project_meta (
                id, name, schedule_from, project_start_date, project_finish_date,
                hours_per_day, hours_per_week, days_per_month, currency_symbol,
                schema_version, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                data.meta.id,
                data.meta.name,
                data.meta.schedule_from.as_str(),
                data.meta.project_start_date,
                data.meta.project_finish_date,
                data.meta.hours_per_day,
                data.meta.hours_per_week,
                data.meta.days_per_month,
                data.meta.currency_symbol,
                data.meta.schema_version,
                data.meta.created_at,
                chrono::Utc::now().naive_utc().format("%Y-%m-%dT%H:%M:%S").to_string(),
            ],
        )?;

        // 2. Calendar
        tx.execute(
            "INSERT INTO calendars (
                id, name, is_default, mon_hours, tue_hours, wed_hours,
                thu_hours, fri_hours, sat_hours, sun_hours
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                data.calendar.id,
                data.calendar.name,
                if data.calendar.is_default { 1 } else { 0 },
                data.calendar.mon_hours,
                data.calendar.tue_hours,
                data.calendar.wed_hours,
                data.calendar.thu_hours,
                data.calendar.fri_hours,
                data.calendar.sat_hours,
                data.calendar.sun_hours,
            ],
        )?;

        // 3. Calendar Exceptions
        for exc in &data.exceptions {
            tx.execute(
                "INSERT INTO calendar_exceptions (
                    id, calendar_id, exception_date, is_working, working_hours, description
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    exc.id,
                    exc.calendar_id,
                    exc.exception_date,
                    if exc.is_working { 1 } else { 0 },
                    exc.working_hours,
                    exc.description,
                ],
            )?;
        }

        // 4. Tasks (Insert parent tasks first or temporarily disable FK if needed, but since tasks refer to tasks, inserting sorted by sort_order or parent first is good. With deferred or sorted order:)
        // Temporarily disable FK check inside transaction just for batch insert if parent_ids point across
        for t in &data.tasks {
            tx.execute(
                "INSERT INTO tasks (
                    id, parent_id, wbs_code, sort_order, name, duration_hours,
                    start_date, finish_date, constraint_type, constraint_date,
                    percent_complete, is_milestone, is_summary,
                    baseline_start, baseline_finish, baseline_duration_hours, notes
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                params![
                    t.id,
                    t.parent_id,
                    t.wbs_code,
                    t.sort_order,
                    t.name,
                    t.duration_hours,
                    t.start_date,
                    t.finish_date,
                    t.constraint_type,
                    t.constraint_date,
                    t.percent_complete,
                    if t.is_milestone { 1 } else { 0 },
                    if t.is_summary { 1 } else { 0 },
                    t.baseline_start,
                    t.baseline_finish,
                    t.baseline_duration_hours,
                    t.notes,
                ],
            )?;
        }

        // 5. Dependencies
        for dep in &data.dependencies {
            tx.execute(
                "INSERT INTO dependencies (
                    id, predecessor_id, successor_id, dep_type, lag_hours
                ) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    dep.id,
                    dep.predecessor_id,
                    dep.successor_id,
                    dep.dep_type.as_str(),
                    dep.lag_hours,
                ],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn load_project(conn: &Connection, file_path: Option<String>) -> Result<ProjectData> {
        // 1. Meta
        let meta = conn.query_row(
            "SELECT id, name, schedule_from, project_start_date, project_finish_date,
                    hours_per_day, hours_per_week, days_per_month, currency_symbol,
                    schema_version, created_at, updated_at
             FROM project_meta LIMIT 1",
            [],
            |row| {
                let sched_str: String = row.get(2)?;
                Ok(ProjectMeta {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    schedule_from: ScheduleFrom::from_str(&sched_str),
                    project_start_date: row.get(3)?,
                    project_finish_date: row.get(4)?,
                    hours_per_day: row.get(5)?,
                    hours_per_week: row.get(6)?,
                    days_per_month: row.get(7)?,
                    currency_symbol: row.get(8)?,
                    schema_version: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        ).unwrap_or_default();

        // 2. Calendar
        let calendar = conn.query_row(
            "SELECT id, name, is_default, mon_hours, tue_hours, wed_hours,
                    thu_hours, fri_hours, sat_hours, sun_hours
             FROM calendars WHERE is_default = 1 LIMIT 1",
            [],
            |row| {
                let is_def: i32 = row.get(2)?;
                Ok(Calendar {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    is_default: is_def != 0,
                    mon_hours: row.get(3)?,
                    tue_hours: row.get(4)?,
                    wed_hours: row.get(5)?,
                    thu_hours: row.get(6)?,
                    fri_hours: row.get(7)?,
                    sat_hours: row.get(8)?,
                    sun_hours: row.get(9)?,
                })
            },
        ).unwrap_or_default();

        // 3. Calendar Exceptions
        let mut exc_stmt = conn.prepare(
            "SELECT id, calendar_id, exception_date, is_working, working_hours, description
             FROM calendar_exceptions",
        )?;
        let exceptions = exc_stmt
            .query_map([], |row| {
                let is_work: i32 = row.get(3)?;
                Ok(CalendarException {
                    id: row.get(0)?,
                    calendar_id: row.get(1)?,
                    exception_date: row.get(2)?,
                    is_working: is_work != 0,
                    working_hours: row.get(4)?,
                    description: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        // 4. Tasks
        let mut task_stmt = conn.prepare(
            "SELECT id, parent_id, wbs_code, sort_order, name, duration_hours,
                    start_date, finish_date, constraint_type, constraint_date,
                    percent_complete, is_milestone, is_summary,
                    baseline_start, baseline_finish, baseline_duration_hours, notes
             FROM tasks ORDER BY sort_order ASC, id ASC",
        )?;
        let tasks = task_stmt
            .query_map([], |row| {
                let is_m: i32 = row.get(11)?;
                let is_s: i32 = row.get(12)?;
                Ok(Task {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    wbs_code: row.get(2)?,
                    sort_order: row.get(3)?,
                    name: row.get(4)?,
                    duration_hours: row.get(5)?,
                    start_date: row.get(6)?,
                    finish_date: row.get(7)?,
                    constraint_type: row.get(8)?,
                    constraint_date: row.get(9)?,
                    percent_complete: row.get(10)?,
                    is_milestone: is_m != 0,
                    is_summary: is_s != 0,
                    baseline_start: row.get(13)?,
                    baseline_finish: row.get(14)?,
                    baseline_duration_hours: row.get(15)?,
                    notes: row.get(16)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        // 5. Dependencies
        let mut dep_stmt = conn.prepare(
            "SELECT id, predecessor_id, successor_id, dep_type, lag_hours
             FROM dependencies",
        )?;
        let dependencies = dep_stmt
            .query_map([], |row| {
                let dt: String = row.get(3)?;
                Ok(Dependency {
                    id: row.get(0)?,
                    predecessor_id: row.get(1)?,
                    successor_id: row.get(2)?,
                    dep_type: DependencyType::from_str(&dt),
                    lag_hours: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(ProjectData {
            meta,
            calendar,
            exceptions,
            tasks,
            dependencies,
            file_path,
        })
    }
}
