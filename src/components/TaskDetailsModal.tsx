import React, { useState } from 'react';
import { X, ListTodo, Plus, Trash2 } from 'lucide-react';
import { Dependency, DependencyType, Task, TaskDto } from '../types/project';
import { formatDateTime, formatDuration, parseDurationInput } from '../utils/formatters';

interface TaskDetailsModalProps {
  task: TaskDto | null;
  allTasks: TaskDto[];
  dependencies: Dependency[];
  hoursPerDay: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedTask: Task, updatedPredecessors: Dependency[]) => void;
}

type TabType = 'general' | 'predecessors' | 'advanced' | 'notes';

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  allTasks,
  dependencies,
  hoursPerDay,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !task) return null;

  const [activeTab, setActiveTab] = useState<TabType>('general');

  // Form State
  const [name, setName] = useState(task.name);
  const [durationStr, setDurationStr] = useState(formatDuration(task.duration_hours, hoursPerDay));
  const [percent, setPercent] = useState(task.percent_complete);
  const [isMilestone, setIsMilestone] = useState(task.is_milestone);
  const [notes, setNotes] = useState(task.notes || '');

  // Constraints
  const [constraintType, setConstraintType] = useState(task.constraint_type || 'ASAP');
  const [constraintDate, setConstraintDate] = useState(
    task.constraint_date ? task.constraint_date.slice(0, 16) : '',
  );

  // Predecessors for this task
  const [taskDeps, setTaskDeps] = useState<Dependency[]>(() =>
    dependencies.filter((d) => d.successor_id === task.id),
  );

  const handleAddPredecessor = () => {
    // Pick first candidate task that is not this task
    const candidate = allTasks.find((t) => t.id !== task.id);
    if (!candidate) return;

    setTaskDeps([
      ...taskDeps,
      {
        id: `temp-${Date.now()}`,
        predecessor_id: candidate.id,
        successor_id: task.id,
        dep_type: 'FS',
        lag_hours: 0,
      },
    ]);
  };

  const handleRemovePredecessor = (depId: string) => {
    setTaskDeps(taskDeps.filter((d) => d.id !== depId));
  };

  const handleUpdateDepType = (depId: string, type: DependencyType) => {
    setTaskDeps(taskDeps.map((d) => (d.id === depId ? { ...d, dep_type: type } : d)));
  };

  const handleUpdateDepPred = (depId: string, predId: number) => {
    setTaskDeps(taskDeps.map((d) => (d.id === depId ? { ...d, predecessor_id: predId } : d)));
  };

  const handleUpdateDepLag = (depId: string, lagDays: number) => {
    setTaskDeps(taskDeps.map((d) => (d.id === depId ? { ...d, lag_hours: lagDays * hoursPerDay } : d)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedHours = parseDurationInput(durationStr, hoursPerDay) ?? task.duration_hours;

    const updated: Task = {
      ...task,
      name,
      duration_hours: isMilestone ? 0 : parsedHours,
      percent_complete: Math.max(0, Math.min(100, Number(percent))),
      is_milestone: isMilestone || parsedHours === 0,
      notes: notes.trim() ? notes.trim() : null,
      constraint_type: constraintType === 'ASAP' ? null : constraintType,
      constraint_date: constraintDate ? `${constraintDate}:00` : null,
    };

    onSave(updated, taskDeps);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-[560px] max-h-[85vh] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xl flex flex-col text-neutral-800 dark:text-neutral-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/80">
          <div className="flex items-center space-x-2 font-semibold text-sm">
            <ListTodo className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Información de la Tarea: #{task.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-4 bg-neutral-50 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2 px-3 font-medium border-b-2 transition ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('predecessors')}
            className={`py-2 px-3 font-medium border-b-2 transition ${
              activeTab === 'predecessors'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Predecesoras ({taskDeps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`py-2 px-3 font-medium border-b-2 transition ${
              activeTab === 'advanced'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Avanzado
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-2 px-3 font-medium border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Notas
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-3">
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                  Nombre de la tarea
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                    Duración estimada
                  </label>
                  <input
                    type="text"
                    disabled={task.is_summary}
                    value={durationStr}
                    onChange={(e) => setDurationStr(e.target.value)}
                    placeholder="ej. 2d, 12h, 0d"
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                    % Completado
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={task.is_summary}
                    value={percent}
                    onChange={(e) => setPercent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                  <span className="text-neutral-500 text-[11px] block">Comienzo calculado</span>
                  <span className="font-semibold">{formatDateTime(task.start_date)}</span>
                </div>

                <div className="p-2.5 rounded bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
                  <span className="text-neutral-500 text-[11px] block">Fin calculado</span>
                  <span className="font-semibold">{formatDateTime(task.finish_date)}</span>
                </div>
              </div>

              {!task.is_summary && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_milestone"
                    checked={isMilestone}
                    onChange={(e) => setIsMilestone(e.target.checked)}
                    className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_milestone" className="font-medium cursor-pointer">
                    Marcar tarea como un Hito de control (duración 0)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREDECESSORS */}
          {activeTab === 'predecessors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 text-[11px]">
                  Tareas de las que depende el inicio o fin de esta tarea:
                </span>
                <button
                  type="button"
                  onClick={handleAddPredecessor}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir vínculo</span>
                </button>
              </div>

              {taskDeps.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                  No hay dependencias predecesoras asignadas.
                </div>
              ) : (
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Predecesora</th>
                        <th className="px-2 py-1.5 font-semibold">Tipo de relación</th>
                        <th className="px-2 py-1.5 font-semibold">Posposición (días)</th>
                        <th className="w-8 px-1 py-1.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {taskDeps.map((dep) => (
                        <tr key={dep.id}>
                          <td className="px-2 py-1.5">
                            <select
                              value={dep.predecessor_id}
                              onChange={(e) => handleUpdateDepPred(dep.id, Number(e.target.value))}
                              className="w-full px-1.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 cursor-pointer"
                            >
                              {allTasks
                                .filter((t) => t.id !== task.id)
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    #{t.id} - {t.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={dep.dep_type}
                              onChange={(e) =>
                                handleUpdateDepType(dep.id, e.target.value as DependencyType)
                              }
                              className="w-full px-1.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 cursor-pointer"
                            >
                              <option value="FS">Fin a Comienzo (FC / FS)</option>
                              <option value="SS">Comienzo a Comienzo (CC / SS)</option>
                              <option value="FF">Fin a Fin (FF)</option>
                              <option value="SF">Comienzo a Fin (CF / SF)</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.5"
                              value={dep.lag_hours / hoursPerDay}
                              onChange={(e) => handleUpdateDepLag(dep.id, Number(e.target.value))}
                              className="w-full px-1.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950"
                            />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemovePredecessor(dep.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Quitar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADVANCED / CONSTRAINTS */}
          {activeTab === 'advanced' && (
            <div className="space-y-3">
              <div>
                <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                  Tipo de restricción del motor
                </label>
                <select
                  value={constraintType}
                  onChange={(e) => setConstraintType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 cursor-pointer"
                >
                  <option value="ASAP">Lo antes posible (Automática por dependencias)</option>
                  <option value="SNET">No comenzar antes del... (SNET)</option>
                  <option value="FNLT">No finalizar después del... (FNLT)</option>
                  <option value="MSO">Debe comenzar el... (MSO)</option>
                  <option value="MFO">Debe finalizar el... (MFO)</option>
                </select>
              </div>

              {constraintType !== 'ASAP' && (
                <div>
                  <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                    Fecha de restricción
                  </label>
                  <input
                    type="datetime-local"
                    value={constraintDate}
                    onChange={(e) => setConstraintDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              )}

              <div className="p-3 rounded bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-neutral-500 text-[11px] space-y-1">
                <div>
                  Código EDT / WBS: <strong>{task.wbs_code}</strong>
                </div>
                <div>
                  Nivel jerárquico: <strong>{task.depth}</strong>
                </div>
                {task.baseline_start && (
                  <div>
                    Línea Base guardada: {formatDateTime(task.baseline_start)} -{' '}
                    {formatDateTime(task.baseline_finish || '')} (
                    {formatDuration(task.baseline_duration_hours || 0, hoursPerDay)})
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NOTES */}
          {activeTab === 'notes' && (
            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Anotaciones y observaciones de la tarea
              </label>
              <textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe detalles, requerimientos o notas del responsable..."
                className="w-full p-2.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
