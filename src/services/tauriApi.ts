import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ProjectPayload, Task } from '../types/project';

export const tauriApi = {
  async getProject(): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('get_project');
  },

  async newProject(name?: string): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('new_project', { name });
  },

  async openProjectDialog(): Promise<ProjectPayload | null> {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Easy Project (*.epr)', extensions: ['epr'] }],
    });
    if (!selected || typeof selected !== 'string') return null;
    return await invoke<ProjectPayload>('open_project_file', { path: selected });
  },

  async saveProjectDialog(currentPath: string | null): Promise<string | null> {
    let targetPath = currentPath;
    if (!targetPath) {
      const selected = await save({
        filters: [{ name: 'Easy Project (*.epr)', extensions: ['epr'] }],
        defaultPath: 'Proyecto.epr',
      });
      if (!selected) return null;
      targetPath = selected;
    }
    return await invoke<string>('save_project_file', { targetPath });
  },

  async saveProjectAsDialog(): Promise<string | null> {
    const selected = await save({
      filters: [{ name: 'Easy Project (*.epr)', extensions: ['epr'] }],
      defaultPath: 'Proyecto.epr',
    });
    if (!selected) return null;
    return await invoke<string>('save_project_file', { targetPath: selected });
  },

  async exportCsvDialog(): Promise<string | null> {
    const selected = await save({
      filters: [{ name: 'Archivo CSV (*.csv)', extensions: ['csv'] }],
      defaultPath: 'Tareas_Proyecto.csv',
    });
    if (!selected) return null;
    return await invoke<string>('export_project_csv', { path: selected });
  },

  async exportExcelDialog(): Promise<string | null> {
    const selected = await save({
      filters: [{ name: 'Libro de Excel (*.xlsx)', extensions: ['xlsx'] }],
      defaultPath: 'Cronograma_Proyecto.xlsx',
    });
    if (!selected) return null;
    return await invoke<string>('export_project_excel', { path: selected });
  },

  async importXmlDialog(): Promise<ProjectPayload | null> {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'MS Project XML (*.xml)', extensions: ['xml'] }],
    });
    if (!selected || typeof selected !== 'string') return null;
    return await invoke<ProjectPayload>('import_project_xml', { path: selected });
  },

  async updateCalendar(
    calendar: import('../types/project').Calendar,
    exceptions: import('../types/project').CalendarException[],
  ): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('update_calendar', { calendar, exceptions });
  },

  async addTask(afterId?: number, name?: string): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('add_task', { afterId, name });
  },

  async addTasksBatch(tasks: { name: string; duration_hours?: number }[], afterId?: number): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('add_tasks_batch', { tasks, afterId });
  },

  async updateTask(updated: Task): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('update_task', { updated });
  },

  async deleteTask(taskId: number): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('delete_task', { taskId });
  },

  async deleteTasks(taskIds: number[]): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('delete_tasks', { taskIds });
  },

  async indentTask(taskId: number): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('indent_task', { taskId });
  },

  async indentTasks(taskIds: number[]): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('indent_tasks', { taskIds });
  },

  async outdentTask(taskId: number): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('outdent_task', { taskId });
  },

  async outdentTasks(taskIds: number[]): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('outdent_tasks', { taskIds });
  },

  async setTasksDuration(taskIds: number[], durationHours: number): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('set_tasks_duration', { taskIds, durationHours });
  },

  async setTaskPredecessors(taskId: number, expr: string): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('set_task_predecessors', { taskId, expr });
  },

  async addDependency(
    predId: number,
    succId: number,
    depType = 'FS',
    lagHours = 0,
  ): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('add_dependency', {
      predId,
      succId,
      depType,
      lagHours,
    });
  },

  async removeDependency(depId: string): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('remove_dependency', { depId });
  },

  async saveBaseline(): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('save_baseline');
  },

  async clearBaseline(): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('clear_baseline');
  },

  async undo(): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('undo');
  },

  async redo(): Promise<ProjectPayload> {
    return await invoke<ProjectPayload>('redo');
  },

  async getInitialConfig(): Promise<{ language?: string; theme?: string }> {
    try {
      return await invoke<{ language?: string; theme?: string }>('get_initial_config');
    } catch {
      return {};
    }
  },
};
