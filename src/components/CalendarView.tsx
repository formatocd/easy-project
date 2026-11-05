import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react';
import { TaskDto } from '../types/project';
import { formatDateShort } from '../utils/formatters';

interface CalendarViewProps {
  tasks: TaskDto[];
  selectedTaskId: number | null;
  onSelectTask: (taskId: number) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Days in month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Adjust for Monday start (0: Mon, 6: Sun)
  const startOffset = (firstDayIndex + 6) % 7;

  const monthName = currentMonth.toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const weekDayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Map tasks for each calendar day
  const getTasksForDay = (day: number) => {
    const dayDate = new Date(year, month, day);
    const dayStart = new Date(dayDate).setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate).setHours(23, 59, 59, 999);

    return tasks.filter((t) => {
      const s = new Date(t.start_date).getTime();
      const f = new Date(t.finish_date).getTime();
      return s <= dayEnd && f >= dayStart;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 select-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <h2 className="text-sm font-bold capitalize text-neutral-900 dark:text-neutral-100">
          {monthName}
        </h2>
        <div className="flex items-center space-x-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="px-2 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            Hoy
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 text-center text-xs font-semibold text-neutral-500 py-1.5 bg-neutral-100 dark:bg-neutral-900">
        {weekDayHeaders.map((d, i) => (
          <div key={i} className={i >= 5 ? 'text-neutral-400' : ''}>
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-[1px] bg-neutral-200 dark:bg-neutral-800 p-[1px] overflow-auto">
        {/* Empty cells before month start */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="bg-neutral-50/50 dark:bg-neutral-900/40 p-1.5"
          />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday =
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          const dayTasks = getTasksForDay(day);

          return (
            <div
              key={day}
              className={`bg-white dark:bg-neutral-950 p-1.5 flex flex-col justify-between overflow-hidden transition ${
                isToday ? 'ring-2 ring-blue-500 inset-0' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold ${
                    isToday
                      ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {day}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] text-neutral-400">
                    {dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                )}
              </div>

              {/* Tasks in Day */}
              <div className="flex-1 space-y-1 overflow-y-auto pr-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const isSelected = selectedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition ${
                        task.is_milestone
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                          : task.is_summary
                          ? 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 font-bold'
                          : isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 hover:brightness-95'
                      }`}
                      title={`${task.name} (${formatDateShort(task.start_date)} - ${formatDateShort(task.finish_date)})`}
                    >
                      {task.is_milestone && <Diamond className="w-2.5 h-2.5 inline mr-1 fill-current" />}
                      {task.name}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="text-[9px] text-neutral-400 pl-1 font-medium">
                    +{dayTasks.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
