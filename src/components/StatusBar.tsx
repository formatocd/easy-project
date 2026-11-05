import React from 'react';
import { TaskDto } from '../types/project';

interface StatusBarProps {
  tasks: TaskDto[];
  selectedTaskId: number | null;
  scheduleFrom: string;
  calculationMs: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  tasks,
  selectedTaskId,
  scheduleFrom,
  calculationMs,
}) => {
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <footer className="h-6 border-t border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-3 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 select-none">
      <div className="flex items-center space-x-4">
        <span>
          Total tareas: <strong>{tasks.length}</strong>
        </span>
        {selectedTask && (
          <span>
            Seleccionada: <strong>#{selectedTask.id}</strong> {selectedTask.name} ({selectedTask.duration_hours}h)
          </span>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <span>
          Programación:{' '}
          <strong>{scheduleFrom === 'START' ? 'Hacia adelante' : 'Hacia atrás'}</strong>
        </span>
        <span>
          Motor Rust: <strong>{calculationMs.toFixed(2)} ms</strong>
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Listo
        </span>
      </div>
    </footer>
  );
};
