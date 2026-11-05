export type ScheduleFrom = 'START' | 'FINISH';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ProjectMeta {
  id: string;
  name: string;
  schedule_from: ScheduleFrom;
  project_start_date: string;
  project_finish_date: string | null;
  hours_per_day: number;
  hours_per_week: number;
  days_per_month: number;
  currency_symbol: string;
  schema_version: number;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  name: string;
  is_default: boolean;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  sat_hours: number;
  sun_hours: number;
}

export interface CalendarException {
  id: string;
  calendar_id: string;
  exception_date: string;
  is_working: boolean;
  working_hours: number;
  description: string | null;
}

export interface Task {
  id: number;
  parent_id: number | null;
  wbs_code: string;
  sort_order: number;
  name: string;
  duration_hours: number;
  start_date: string;
  finish_date: string;
  constraint_type: string | null;
  constraint_date: string | null;
  percent_complete: number;
  is_milestone: boolean;
  is_summary: boolean;
  baseline_start: string | null;
  baseline_finish: string | null;
  baseline_duration_hours: number | null;
  notes: string | null;
}

export interface Dependency {
  id: string;
  predecessor_id: number;
  successor_id: number;
  dep_type: DependencyType;
  lag_hours: number;
}

export interface TaskDto {
  id: number;
  parent_id: number | null;
  wbs_code: string;
  sort_order: number;
  name: string;
  duration_hours: number;
  start_date: string;
  finish_date: string;
  constraint_type: string | null;
  constraint_date: string | null;
  percent_complete: number;
  is_milestone: boolean;
  is_summary: boolean;
  baseline_start: string | null;
  baseline_finish: string | null;
  baseline_duration_hours: number | null;
  notes: string | null;
  predecessors_display: string;
  depth: number;
  has_children: boolean;
}

export interface ProjectData {
  meta: ProjectMeta;
  calendar: Calendar;
  exceptions: CalendarException[];
  tasks: Task[];
  dependencies: Dependency[];
  file_path: string | null;
}

export interface ProjectPayload {
  data: ProjectData;
  task_dtos: TaskDto[];
  can_undo: boolean;
  can_redo: boolean;
  calculation_ms: number;
}

export type ZoomLevel = 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

export type ActiveView = 'GANTT' | 'CALENDAR';
