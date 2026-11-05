import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Dependency, TaskDto, ZoomLevel, Task } from '../types/project';
import { formatDateTime, formatDuration, getPixelsPerHour } from '../utils/formatters';

interface GanttChartProps {
  tasks: TaskDto[];
  dependencies: Dependency[];
  zoomLevel: ZoomLevel;
  selectedTaskId: number | null;
  hoursPerDay: number;
  projectStartDate: string;
  onSelectTask: (taskId: number) => void;
  onUpdateTask: (task: Task) => void;
  onAddDependency: (predId: number, succId: number) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

const ROW_HEIGHT = 32;

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  dependencies,
  zoomLevel,
  selectedTaskId,
  hoursPerDay,
  projectStartDate,
  onSelectTask,
  onUpdateTask,
  onAddDependency,
  scrollRef,
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasAutoScrolled = useRef(false);

  // Dragging states
  const [dragging, setDragging] = useState<{
    taskId: number;
    type: 'move' | 'resize' | 'link';
    startX: number;
    initialStartMs: number;
    initialDurationHours: number;
  } | null>(null);

  const [linkTarget, setLinkTarget] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Time Range & Calculations
  const { minDate, maxDate, totalHours, startMs } = useMemo(() => {
    let minMs = new Date(projectStartDate).getTime();
    if (isNaN(minMs)) minMs = Date.now();
    let maxMs = minMs + 30 * 24 * 3600 * 1000;

    for (const t of tasks) {
      if (t.start_date) {
        const s = new Date(t.start_date).getTime();
        if (!isNaN(s) && s < minMs) minMs = s;
      }
      if (t.finish_date) {
        const f = new Date(t.finish_date).getTime();
        if (!isNaN(f) && f > maxMs) maxMs = f;
      }
    }

    // Buffer padding: 5 days before, 20 days after
    minMs -= 5 * 24 * 3600 * 1000;
    maxMs += 20 * 24 * 3600 * 1000;

    const start = new Date(minMs);
    start.setHours(0, 0, 0, 0);

    const end = new Date(maxMs);
    end.setHours(23, 59, 59, 999);

    const hours = (end.getTime() - start.getTime()) / (1000 * 3600);

    return {
      minDate: start,
      maxDate: end,
      totalHours: hours,
      startMs: start.getTime(),
    };
  }, [tasks, projectStartDate]);

  const pxPerHour = getPixelsPerHour(zoomLevel, hoursPerDay);
  const chartWidth = Math.max(1400, totalHours * pxPerHour);

  const timeToPx = (isoString: string): number => {
    if (!isoString) return 0;
    const t = new Date(isoString).getTime();
    const hoursFromStart = (t - startMs) / (1000 * 3600);
    return hoursFromStart * pxPerHour;
  };

  // Auto-scroll on initial load to project start / today
  useEffect(() => {
    if (!hasAutoScrolled.current && containerRef.current) {
      const targetIso = tasks[0]?.start_date || projectStartDate;
      const targetPx = timeToPx(targetIso);
      if (targetPx > 100) {
        containerRef.current.scrollLeft = Math.max(0, targetPx - 150);
        hasAutoScrolled.current = true;
      }
    }
  }, [tasks, projectStartDate]);

  // Timeline ticks (Days and Months)
  const timelineTicks = useMemo(() => {
    const ticks: {
      x: number;
      width: number;
      labelTop?: string;
      labelBottom: string;
      isWeekend?: boolean;
    }[] = [];
    const current = new Date(minDate);
    const dayWidth = 24 * pxPerHour;

    while (current <= maxDate) {
      const x = ((current.getTime() - startMs) / (1000 * 3600)) * pxPerHour;
      const day = current.getDate();
      const month = current.getMonth() + 1;
      const weekday = current.getDay();
      const isWeekend = weekday === 0 || weekday === 6;

      const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      const labelBottom = `${day}`;
      const labelTop =
        current.getDate() === 1 || ticks.length === 0
          ? MONTH_NAMES[month - 1]
          : undefined;

      ticks.push({ x, width: dayWidth, labelTop, labelBottom, isWeekend });
      current.setDate(current.getDate() + 1);
    }

    return ticks;
  }, [minDate, maxDate, startMs, pxPerHour]);

  // Today marker
  const todayX = useMemo(() => {
    const now = Date.now();
    return ((now - startMs) / (1000 * 3600)) * pxPerHour;
  }, [startMs, pxPerHour]);

  // Mouse handlers for dragging
  const handleMouseDown = (
    e: React.MouseEvent,
    taskId: number,
    type: 'move' | 'resize' | 'link',
  ) => {
    e.stopPropagation();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.is_summary) return;

    setDragging({
      taskId,
      type,
      startX: e.clientX,
      initialStartMs: new Date(task.start_date).getTime(),
      initialDurationHours: task.duration_hours,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragging.startX;

    if (dragging.type === 'link') {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relY = e.clientY - rect.top + (scrollRef?.current?.scrollTop || 0) - 40;
        const rowIdx = Math.floor(relY / ROW_HEIGHT);
        if (rowIdx >= 0 && rowIdx < tasks.length) {
          const hoveredId = tasks[rowIdx].id;
          if (hoveredId !== dragging.taskId) {
            setLinkTarget(hoveredId);
            return;
          }
        }
      }
      setLinkTarget(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragging) return;

    const deltaX = e.clientX - dragging.startX;
    const task = tasks.find((t) => t.id === dragging.taskId);

    if (task && !task.is_summary) {
      if (dragging.type === 'move') {
        const deltaHours = deltaX / pxPerHour;
        const newStartMs = dragging.initialStartMs + deltaHours * 3600 * 1000;
        const newStartIso = new Date(newStartMs).toISOString().slice(0, 19);

        onUpdateTask({
          ...task,
          start_date: newStartIso,
          constraint_type: 'SNET',
          constraint_date: newStartIso,
        });
      } else if (dragging.type === 'resize') {
        const deltaHours = deltaX / pxPerHour;
        const newHours = Math.max(0, dragging.initialDurationHours + deltaHours);

        onUpdateTask({
          ...task,
          duration_hours: Number(newHours.toFixed(1)),
          is_milestone: newHours === 0,
        });
      } else if (dragging.type === 'link' && linkTarget !== null) {
        onAddDependency(dragging.taskId, linkTarget);
      }
    }

    setDragging(null);
    setLinkTarget(null);
  };

  return (
    <div
      ref={(el) => {
        if (containerRef) containerRef.current = el;
        if (scrollRef && typeof scrollRef !== 'function') {
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      }}
      onScroll={onScroll}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="h-full overflow-auto bg-neutral-900 dark:bg-neutral-950 select-none relative"
    >
      <div
        id="gantt-canvas-container"
        style={{ width: `${chartWidth}px`, minHeight: `${tasks.length * ROW_HEIGHT + 45}px` }}
        className="relative"
      >
        {/* Timeline Header (Double Level) */}
        <div className="sticky top-0 h-9 bg-neutral-800 dark:bg-neutral-900 border-b border-neutral-700 z-30 text-[10px] text-neutral-400 font-medium select-none shadow-md flex items-center">
          {timelineTicks.map((tick, i) => (
            <div
              key={i}
              style={{ left: `${tick.x}px`, width: `${tick.width}px` }}
              className={`absolute top-0 bottom-0 border-r border-neutral-700/80 px-1 py-0.5 flex flex-col justify-between ${
                tick.isWeekend ? 'bg-neutral-950/40 text-neutral-500' : 'text-neutral-300'
              }`}
            >
              <div className="font-bold text-[10px] text-blue-400 truncate text-center">
                {tick.labelTop || ''}
              </div>
              <div className="text-center font-mono text-[10px]">{tick.labelBottom}</div>
            </div>
          ))}
        </div>

        {/* Full Grid Lines (Vertical columns) in Background */}
        <div className="absolute top-9 bottom-0 left-0 right-0 pointer-events-none z-0">
          {timelineTicks.map((tick, idx) => (
            <div
              key={idx}
              style={{ left: `${tick.x}px`, width: `${tick.width}px` }}
              className={`absolute top-0 bottom-0 border-r border-neutral-800/60 ${
                tick.isWeekend ? 'bg-neutral-950/30' : ''
              }`}
            />
          ))}
        </div>

        {/* Today Vertical Marker */}
        {todayX >= 0 && todayX <= chartWidth && (
          <div
            style={{ left: `${todayX}px`, top: '36px' }}
            className="absolute bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.7)]"
            title="Fecha actual (Hoy)"
          />
        )}

        {/* Dependency Arrows (SVG) */}
        <svg
          className="absolute top-9 left-0 pointer-events-none z-20"
          style={{ width: `${chartWidth}px`, height: `${tasks.length * ROW_HEIGHT}px` }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {dependencies.map((dep) => {
            const predIdx = tasks.findIndex((t) => t.id === dep.predecessor_id);
            const succIdx = tasks.findIndex((t) => t.id === dep.successor_id);
            if (predIdx === -1 || succIdx === -1) return null;

            const pred = tasks[predIdx];
            const succ = tasks[succIdx];

            const predX = timeToPx(pred.finish_date);
            const predY = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

            const succX = timeToPx(succ.start_date);
            const succY = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

            const midX = predX + 14;
            const pathD = `M ${predX} ${predY} L ${midX} ${predY} L ${midX} ${succY} L ${succX} ${succY}`;

            return (
              <path
                key={dep.id}
                d={pathD}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
                opacity="0.9"
              />
            );
          })}
        </svg>

        {/* Task Rows & Interactive Bars */}
        <div className="absolute top-9 left-0 right-0">
          {tasks.map((task, idx) => {
            const isSelected = selectedTaskId === task.id;
            const startX = timeToPx(task.start_date);
            const finishX = timeToPx(task.finish_date);
            const width = Math.max(6, finishX - startX);
            const top = idx * ROW_HEIGHT;

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                onMouseEnter={() =>
                  setTooltip({
                    text: `${task.name}\nInicio: ${formatDateTime(task.start_date)}\nFin: ${formatDateTime(task.finish_date)}\nDuración: ${formatDuration(task.duration_hours, hoursPerDay)} (${task.percent_complete}%)`,
                    x: Math.min(window.innerWidth - 220, startX + width + 10),
                    y: top + 40,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
                style={{ top: `${top}px`, height: `${ROW_HEIGHT}px` }}
                className={`absolute left-0 right-0 border-b border-neutral-800/80 flex items-center transition ${
                  isSelected ? 'bg-blue-900/20' : 'hover:bg-neutral-800/30'
                }`}
              >
                {/* 1. Milestone (Hito) */}
                {task.is_milestone ? (
                  <div
                    style={{ left: `${startX - 7}px` }}
                    className="absolute z-20 group cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 bg-amber-400 transform rotate-45 border-2 border-amber-600 shadow-sm" />
                    <span className="absolute left-5 top-[-2px] text-[11px] font-semibold text-amber-300 whitespace-nowrap drop-shadow">
                      {task.name}
                    </span>
                  </div>
                ) : task.is_summary ? (
                  /* 2. Summary Task (Classic MS Project Style Bracket) */
                  <div
                    style={{ left: `${startX}px`, width: `${width}px` }}
                    className="absolute z-20"
                  >
                    {/* Top horizontal solid bar */}
                    <div className="h-2.5 bg-neutral-300 dark:bg-neutral-100 rounded-xs shadow relative">
                      {/* Left bracket beak */}
                      <div className="absolute -left-0.5 top-0 w-2 h-3.5 bg-neutral-300 dark:bg-neutral-100 [clip-path:polygon(0_0,100%_0,0_100%)]" />
                      {/* Right bracket beak */}
                      <div className="absolute -right-0.5 top-0 w-2 h-3.5 bg-neutral-300 dark:bg-neutral-100 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
                      {/* Progress line inside summary */}
                      <div
                        style={{ width: `${task.percent_complete}%` }}
                        className="h-1 bg-blue-500 rounded-xs"
                      />
                    </div>

                    <span className="absolute left-full ml-2.5 -top-1 text-[11px] font-bold text-neutral-200 whitespace-nowrap drop-shadow">
                      {task.name} <span className="text-neutral-400 font-normal">({task.percent_complete}%)</span>
                    </span>
                  </div>
                ) : (
                  /* 3. Normal Task Bar */
                  <div
                    style={{ left: `${startX}px`, width: `${width}px` }}
                    onMouseDown={(e) => handleMouseDown(e, task.id, 'move')}
                    className={`absolute h-5 rounded z-10 cursor-move shadow flex items-center justify-between group transition-shadow ${
                      isSelected
                        ? 'bg-blue-600 ring-2 ring-blue-300'
                        : 'bg-blue-500 hover:brightness-110'
                    }`}
                  >
                    {/* Inner Progress Bar */}
                    <div
                      style={{ width: `${task.percent_complete}%` }}
                      className="absolute top-0 bottom-0 left-0 bg-blue-800 rounded-l pointer-events-none"
                    />

                    {/* Predecessor link connector dot (Right edge) */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'link')}
                      className="w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-600 opacity-0 group-hover:opacity-100 cursor-crosshair ml-auto mr-1 z-30 transition shadow"
                      title="Arrastrar para vincular a otra tarea"
                    />

                    {/* Resize handle (Right edge) */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'resize')}
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/40 rounded-r z-20"
                    />

                    {/* Task Label beside bar */}
                    <span className="absolute left-full ml-2 text-[11px] font-medium text-neutral-200 whitespace-nowrap pointer-events-none drop-shadow">
                      {task.name}{' '}
                      {task.percent_complete > 0 ? (
                        <span className="text-neutral-400">({task.percent_complete}%)</span>
                      ) : (
                        ''
                      )}
                    </span>

                    {/* Baseline Bar (Comparative line underneath) */}
                    {task.baseline_start && task.baseline_finish && (
                      <div
                        style={{
                          left: `${timeToPx(task.baseline_start) - startX}px`,
                          width: `${Math.max(2, timeToPx(task.baseline_finish) - timeToPx(task.baseline_start))}px`,
                        }}
                        className="absolute -bottom-2 h-1 bg-amber-400 rounded-xs pointer-events-none shadow-sm"
                        title="Línea Base Original"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
