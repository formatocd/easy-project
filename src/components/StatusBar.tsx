import React from 'react';
import { TaskDto } from '../types/project';
import { Language, translations } from '../i18n/translations';

interface StatusBarProps {
  tasks: TaskDto[];
  selectedTaskIds: number[];
  scheduleFrom: string;
  calculationMs: number;
  language: Language;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  tasks,
  selectedTaskIds,
  scheduleFrom,
  calculationMs,
  language,
}) => {
  const t = translations[language];
  const selectedTask = selectedTaskIds.length === 1 ? tasks.find((t) => t.id === selectedTaskIds[0]) : null;

  return (
    <footer className="h-6 border-t border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-3 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 select-none whitespace-nowrap overflow-hidden gap-2">
      <div className="flex items-center space-x-4 min-w-0 truncate">
        <span className="shrink-0">
          {t.totalTasks}: <strong>{tasks.length}</strong>
        </span>
        {selectedTaskIds.length > 1 ? (
          <span className="truncate text-blue-600 dark:text-blue-400 font-medium">
            {t.selectedMulti}: <strong>{selectedTaskIds.length}</strong>
          </span>
        ) : selectedTask ? (
          <span className="truncate">
            {t.selectedSingle}: <strong>#{selectedTask.id}</strong> {selectedTask.name} ({selectedTask.duration_hours}h)
          </span>
        ) : null}
      </div>

      <div className="flex items-center space-x-4 shrink-0">
        <span>
          {t.scheduling}:{' '}
          <strong>{scheduleFrom === 'START' ? t.forward : t.backward}</strong>
        </span>
        <span>
          {t.rustEngine}: <strong>{calculationMs.toFixed(2)} ms</strong>
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {t.ready}
        </span>
      </div>
    </footer>
  );
};
