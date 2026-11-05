import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Diamond, FolderTree, CheckSquare, Plus } from 'lucide-react';
import { TaskDto, Task } from '../types/project';
import { formatDateTime, formatDuration, parseDurationInput } from '../utils/formatters';
import { Language, translations } from '../i18n/translations';

interface TaskSheetProps {
  tasks: TaskDto[];
  selectedTaskIds: number[];
  collapsedTaskIds: Set<number>;
  hoursPerDay: number;
  language: Language;
  onSelectTask: (taskId: number, e?: React.MouseEvent) => void;
  onToggleCollapse: (taskId: number) => void;
  onOpenTaskDetails: (taskId: number) => void;
  onUpdateTask: (task: Task) => void;
  onSetTasksDuration: (taskIds: number[], hours: number) => void;
  onSetPredecessors: (taskId: number, expr: string) => void;
  onAddTask: (name?: string) => void;
  onAddTasksBatch: (tasks: { name: string; duration_hours?: number }[]) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

type EditableField = 'name' | 'duration' | 'predecessors' | 'percent';

export const TaskSheet: React.FC<TaskSheetProps> = ({
  tasks,
  selectedTaskIds,
  collapsedTaskIds,
  hoursPerDay,
  language,
  onSelectTask,
  onToggleCollapse,
  onOpenTaskDetails,
  onUpdateTask,
  onSetTasksDuration,
  onSetPredecessors,
  onAddTask,
  onAddTasksBatch,
  scrollRef,
  onScroll,
}) => {
  const t = translations[language];
  const [editingCell, setEditingCell] = useState<{ id: number; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [quickTaskName, setQuickTaskName] = useState<string>('');
  const [containerWidth, setContainerWidth] = useState<number>(520);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  // Measure visible pane width to auto-center empty state banner
  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;
    setContainerWidth(el.clientWidth || 520);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRef]);

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
      if (hours !== null) {
        if (selectedTaskIds.length > 1 && selectedTaskIds.includes(task.id)) {
          // Batch duration update for all selected tasks
          onSetTasksDuration(selectedTaskIds, hours);
        } else if (hours !== task.duration_hours) {
          onUpdateTask({
            ...task,
            duration_hours: hours,
            is_milestone: hours === 0,
          });
        }
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

  // Clipboard paste handler (like ProjectLibre / MS Project / Excel)
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;

    const rawLines = text.split(/\r?\n/);
    const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);

    // If multiple lines or single line with tab separation (multi-column)
    if (lines.length > 1 || (lines.length === 1 && lines[0].includes('\t'))) {
      e.preventDefault();
      const parsedTasks: { name: string; duration_hours?: number }[] = [];

      for (const line of lines) {
        if (line.includes('\t')) {
          const cols = line.split('\t');
          const name = cols[0].trim();
          if (!name) continue;
          let durationHours: number | undefined = undefined;
          if (cols.length > 1 && cols[1].trim()) {
            const parsed = parseDurationInput(cols[1], hoursPerDay);
            if (parsed !== null) durationHours = parsed;
          }
          parsedTasks.push({ name, duration_hours: durationHours });
        } else {
          parsedTasks.push({ name: line });
        }
      }

      if (parsedTasks.length > 0) {
        onAddTasksBatch(parsedTasks);
      }
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickTaskName.trim();
    if (name) {
      onAddTask(name);
      setQuickTaskName('');
    } else {
      onAddTask();
    }
    // Keep focus on input for fast repeated entry
    setTimeout(() => {
      quickInputRef.current?.focus();
    }, 50);
  };

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      onPaste={handlePaste}
      tabIndex={0}
      className="h-full overflow-auto bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 select-none text-xs border-r border-neutral-300 dark:border-neutral-800 outline-none"
    >
      <table className="w-full border-collapse text-left table-fixed">
        <thead className="sticky top-0 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold z-10 shadow-sm">
          <tr style={{ height: '36px' }}>
            <th className="w-10 px-1 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">{t.id}</th>
            <th className="w-8 px-1 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">{t.type}</th>
            <th className="w-14 px-1 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">{t.wbs}</th>
            <th className="w-56 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">{t.taskName}</th>
            <th className="w-20 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 text-right align-middle">{t.duration}</th>
            <th className="w-32 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">{t.start}</th>
            <th className="w-32 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">{t.finish}</th>
            <th className="w-24 px-2 py-0 h-9 border-r border-neutral-200 dark:border-neutral-800 align-middle">{t.predecessors}</th>
            <th className="w-16 px-2 py-0 h-9 text-right align-middle">{t.percent}</th>
          </tr>
        </thead>
        <tbody>
          {/* Empty project initial guide banner (Centered in visible pane) */}
          {tasks.length === 0 && (
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
              <td colSpan={9} className="p-0 border-none">
                <div
                  className="sticky left-0 py-10 px-4 flex flex-col items-center justify-center text-center overflow-hidden"
                  style={{ width: `${containerWidth}px` }}
                >
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.emptyTitle}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm mx-auto leading-relaxed">
                    {t.emptyDesc}{' '}
                    <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono text-[10px] text-neutral-700 dark:text-neutral-300">Enter</kbd>
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddTask()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium text-xs shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.emptyBtn}
                  </button>
                </div>
              </td>
            </tr>
          )}

          {/* List of existing tasks */}
          {tasks.map((task) => {
            const isSelected = selectedTaskIds.includes(task.id);
            const isEditing = editingCell?.id === task.id;
            const isCollapsed = collapsedTaskIds.has(task.id);
            const isMultiSelected = isSelected && selectedTaskIds.length > 1;

            return (
              <tr
                key={task.id}
                onClick={(e) => onSelectTask(task.id, e)}
                onDoubleClick={() => onOpenTaskDetails(task.id)}
                className={`border-b border-neutral-200 dark:border-neutral-800 transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-950 dark:text-blue-100 font-medium'
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

                {/* WBS */}
                <td className="px-1.5 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                  {task.wbs_code}
                </td>

                {/* Task Name with Indentation & Collapse Toggle */}
                <td
                  className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle truncate"
                  style={{ paddingLeft: `${task.depth * 16 + 6}px` }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(task, 'name');
                  }}
                >
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
                    <div className="flex items-center space-x-1 truncate">
                      {task.has_children ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse(task.id);
                          }}
                          className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 shrink-0 transition"
                          title={isCollapsed ? 'Expandir sub-tareas' : 'Contraer sub-tareas'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4 shrink-0" />
                      )}
                      <span className={task.is_summary ? 'font-bold' : ''}>
                        {task.name}
                      </span>
                    </div>
                  )}
                </td>

                {/* Duration */}
                <td
                  className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-right align-middle font-mono text-[11px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(task, 'duration');
                  }}
                  title={isMultiSelected ? `Doble clic para cambiar duración de las ${selectedTaskIds.length} tareas seleccionadas` : undefined}
                >
                  {isEditing && editingCell?.field === 'duration' ? (
                    <div className="relative">
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(task)}
                        onKeyDown={(e) => handleKeyDown(e, task)}
                        className="w-full bg-white dark:bg-neutral-900 border border-blue-500 px-1 py-0.5 rounded text-xs text-right outline-none"
                      />
                    </div>
                  ) : (
                    <span className={task.is_summary ? 'font-semibold italic' : ''}>
                      {formatDuration(task.duration_hours, hoursPerDay)}
                    </span>
                  )}
                </td>

                {/* Start Date */}
                <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                  {formatDateTime(task.start_date)}
                </td>

                {/* Finish Date */}
                <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle text-neutral-600 dark:text-neutral-400 font-mono text-[11px]">
                  {formatDateTime(task.finish_date)}
                </td>

                {/* Predecessors */}
                <td
                  className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle font-mono text-[11px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(task, 'predecessors');
                  }}
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
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {task.predecessors_display || '-'}
                    </span>
                  )}
                </td>

                {/* Percent Complete */}
                <td
                  className="px-2 py-0 h-8 text-right align-middle"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(task, 'percent');
                  }}
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

          {/* Quick Add Row (Always present at the bottom, like in ProjectLibre / MS Project) */}
          <tr
            className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/30 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 transition cursor-text group"
            style={{ height: '32px' }}
            onClick={() => quickInputRef.current?.focus()}
          >
            <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle text-neutral-400 text-[11px] font-mono">
              *
            </td>
            <td className="px-1 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle">
              <Plus className="w-3.5 h-3.5 text-blue-500 mx-auto group-hover:scale-110 transition" />
            </td>
            <td className="px-1 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-center align-middle text-neutral-400">
              -
            </td>
            <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle">
              <form onSubmit={handleQuickAddSubmit} className="w-full flex items-center">
                <input
                  ref={quickInputRef}
                  type="text"
                  value={quickTaskName}
                  onChange={(e) => setQuickTaskName(e.target.value)}
                  placeholder={tasks.length === 0 ? t.quickAddPlaceholder : t.quickAddRow}
                  className="w-full bg-transparent border-none outline-none text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:placeholder-transparent"
                />
              </form>
            </td>
            <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 text-right align-middle text-neutral-400 font-mono text-[11px]">
              1d
            </td>
            <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle text-neutral-400">
              -
            </td>
            <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle text-neutral-400">
              -
            </td>
            <td className="px-2 py-0 h-8 border-r border-neutral-200 dark:border-neutral-800 align-middle text-neutral-400">
              -
            </td>
            <td className="px-2 py-0 h-8 text-right align-middle text-neutral-400">
              0%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
