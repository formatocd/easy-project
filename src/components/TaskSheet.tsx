import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Diamond, FolderTree, CheckSquare } from 'lucide-react';
import { TaskDto, Task } from '../types/project';
import { formatDateTime, formatDuration, parseDurationInput } from '../utils/formatters';

interface TaskSheetProps {
  tasks: TaskDto[];
  selectedTaskId: number | null;
  hoursPerDay: number;
  onSelectTask: (taskId: number) => void;
  onUpdateTask: (task: Task) => void;
  onSetPredecessors: (taskId: number, expr: string) => void;
  onAddTaskBelow: (taskId: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

type EditableField = 'name' | 'duration' | 'predecessors' | 'percent';

export const TaskSheet: React.FC<TaskSheetProps> = ({
  tasks,
  selectedTaskId,
  hoursPerDay,
  onSelectTask,
  onUpdateTask,
  onSetPredecessors,
  onAddTaskBelow,
  scrollRef,
  onScroll,
}) => {
  const [editingCell, setEditingCell] = useState<{ id: number; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEditing = (task: TaskDto, field: EditableField) => {
    if (task.is_summary && (field === 'duration' || field === 'percent')) {
      // Summary tasks have auto-calculated duration and progress
      return;
    }

    let initial = '';
    switch (field) {
      case 'name':
        initial = task.name;
        break;
      case 'duration':
        initial = formatDuration(task.duration_hours, hoursPerDay);
        break;
      case 'predecessors':
        initial = task.predecessors_display;
        break;
      case 'percent':
        initial = `${task.percent_complete}%`;
        break;
    }

    setEditingCell({ id: task.id, field });
    setEditValue(initial);
  };

  const commitEdit = (task: TaskDto) => {
    if (!editingCell) return;

    const trimmed = editValue.trim();
    const { field } = editingCell;

    if (field === 'name') {
      if (trimmed && trimmed !== task.name) {
        onUpdateTask({ ...task, name: trimmed });
      }
    } else if (field === 'duration') {
      const hours = parseDurationInput(trimmed, hoursPerDay);
      if (hours !== null && hours !== task.duration_hours) {
        onUpdateTask({
          ...task,
          duration_hours: hours,
          is_milestone: hours === 0,
        });
      }
    } else if (field === 'predecessors') {
      if (trimmed !== task.predecessors_display) {
        onSetPredecessors(task.id, trimmed);
      }
    } else if (field === 'percent') {
      let num = parseFloat(trimmed.replace('%', ''));
      if (!isNaN(num)) {
        num = Math.max(0, Math.min(100, num));
        if (num !== task.percent_complete) {
          onUpdateTask({ ...task, percent_complete: num });
        }
      }
    }

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, task: TaskDto) => {
    if (e.key === 'Enter') {
      commitEdit(task);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="h-full overflow-auto bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 select-none text-xs border-r border-neutral-300 dark:border-neutral-800"
    >
      <table className="w-full border-collapse text-left table-fixed">
        <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold z-10 shadow-sm">
          <tr style={{ height: '36px' }}>
            <th className="w-10 px-1 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">ID</th>
            <th className="w-8 px-1 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">Tipo</th>
            <th className="w-14 px-1 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">EDT</th>
            <th className="w-56 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">Nombre de tarea</th>
            <th className="w-20 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-right align-middle">Duración</th>
            <th className="w-32 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">Comienzo</th>
            <th className="w-32 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">Fin</th>
            <th className="w-24 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">Predecesoras</th>
            <th className="w-16 px-2 py-0 h-9 text-right align-middle">% Avance</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            const isEditing = editingCell?.id === task.id;

            return (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`border-b border-neutral-200 dark:border-neutral-800 transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-medium'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60'
                }`}
                style={{ height: '32px' }}
              >
                {/* ID */}
                <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle text-neutral-500 dark:text-neutral-400 text-[11px]">
                  {task.id}
                </td>

                {/* Indicator / Type */}
                <td className="px-1 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">
                  {task.is_milestone ? (
                    <Diamond className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mx-auto" />
                  ) : task.is_summary ? (
                    <FolderTree className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mx-auto" />
                  ) : (
                    <CheckSquare className="w-3 h-3 text-neutral-400 mx-auto" />
                  )}
                </td>

                {/* WBS Code */}
                <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                  {task.wbs_code}
                </td>

                {/* Task Name (Indented) */}
                <td
                  className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 truncate align-middle"
                  onDoubleClick={() => startEditing(task, 'name')}
                >
                  <div className="flex items-center" style={{ paddingLeft: `${task.depth * 14}px` }}>
                    {task.is_summary ? (
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                        <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" />
                        {isEditing && editingCell?.field === 'name' ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(task)}
                            onKeyDown={(e) => handleKeyDown(e, task)}
                            className="w-full bg-white dark:bg-neutral-900 border border-blue-500 px-1 py-0.5 rounded text-xs outline-none"
                          />
                        ) : (
                          <span className="truncate">{task.name}</span>
                        )}
                      </span>
                    ) : (
                      <div className="w-full truncate pl-3">
                        {isEditing && editingCell?.field === 'name' ? (
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(task)}
                            onKeyDown={(e) => handleKeyDown(e, task)}
                            className="w-full bg-white dark:bg-neutral-900 border border-blue-500 px-1 py-0.5 rounded text-xs outline-none"
                          />
                        ) : (
                          <span className="truncate">{task.name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Duration */}
                <td
                  className={`px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-right align-middle ${
                    task.is_summary ? 'text-neutral-500 italic' : ''
                  }`}
                  onDoubleClick={() => startEditing(task, 'duration')}
                >
                  {isEditing && editingCell?.field === 'duration' ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(task)}
                      onKeyDown={(e) => handleKeyDown(e, task)}
                      className="w-full bg-white dark:bg-neutral-900 border border-blue-500 px-1 py-0.5 rounded text-xs text-right outline-none"
                    />
                  ) : (
                    formatDuration(task.duration_hours, hoursPerDay)
                  )}
                </td>

                {/* Start Date */}
                <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 truncate align-middle text-[11px] text-neutral-600 dark:text-neutral-300">
                  {formatDateTime(task.start_date)}
                </td>

                {/* Finish Date */}
                <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 truncate align-middle text-[11px] text-neutral-600 dark:text-neutral-300">
                  {formatDateTime(task.finish_date)}
                </td>

                {/* Predecessors */}
                <td
                  className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 truncate align-middle"
                  onDoubleClick={() => startEditing(task, 'predecessors')}
                >
                  {isEditing && editingCell?.field === 'predecessors' ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(task)}
                      onKeyDown={(e) => handleKeyDown(e, task)}
                      className="w-full bg-white dark:bg-neutral-900 border border-blue-500 px-1 py-0.5 rounded text-xs outline-none"
                    />
                  ) : (
                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {task.predecessors_display || '-'}
                    </span>
                  )}
                </td>

                {/* Percent Complete */}
                <td
                  className="px-2 py-0 h-8 text-right align-middle"
                  onDoubleClick={() => startEditing(task, 'percent')}
                >
                  {isEditing && editingCell?.field === 'percent' ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(task)}
                      onKeyDown={(e) => handleKeyDown(e, task)}
                      className="w-full bg-white dark:bg-neutral-900 border border-blue-500 px-1 py-0.5 rounded text-xs text-right outline-none"
                    />
                  ) : (
                    <span className="font-medium">{task.percent_complete}%</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
