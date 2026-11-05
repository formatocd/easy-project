import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ActiveView, Calendar, CalendarException, Dependency, ProjectPayload, Task, TaskDto, ZoomLevel } from './types/project';
import { tauriApi } from './services/tauriApi';
import { Toolbar } from './components/Toolbar';
import { TaskSheet } from './components/TaskSheet';
import { GanttChart } from './components/GanttChart';
import { CalendarView } from './components/CalendarView';
import { SplitPane } from './components/SplitPane';
import { StatusBar } from './components/StatusBar';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { ExportPdfModal } from './components/ExportPdfModal';
import { CalendarSettingsModal } from './components/CalendarSettingsModal';
import { Language } from './i18n/translations';

export const App: React.FC = () => {
  const [projectPayload, setProjectPayload] = useState<ProjectPayload | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Set<number>>(new Set());
  const [activeView, setActiveView] = useState<ActiveView>('GANTT');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('DAYS');
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('easy_project_lang');
    return saved === 'en' || saved === 'es' ? saved : 'es';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('easy_project_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'es' ? 'en' : 'es';
      localStorage.setItem('easy_project_lang', next);
      return next;
    });
  }, []);

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const selectedTaskId = selectedTaskIds[0] ?? null;

  // Sync dark class on body & localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('easy_project_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('easy_project_theme', 'light');
    }
  }, [darkMode]);

  // Load project initially
  const loadProject = useCallback(async () => {
    try {
      const payload = await tauriApi.getProject();
      setProjectPayload(payload);
      if (payload.task_dtos.length > 0 && selectedTaskIds.length === 0) {
        setSelectedTaskIds([payload.task_dtos[0].id]);
      }
    } catch (err: any) {
      console.error(err);
    }
  }, [selectedTaskIds.length]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Toggle tree collapse on parent task
  const toggleCollapse = useCallback((taskId: number) => {
    setCollapsedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Compute visible tasks respecting hierarchical collapse
  const visibleTaskDtos = useMemo(() => {
    if (!projectPayload) return [];
    if (collapsedTaskIds.size === 0) return projectPayload.task_dtos;

    const idToTask = new Map<number, TaskDto>();
    for (const t of projectPayload.task_dtos) {
      idToTask.set(t.id, t);
    }

    return projectPayload.task_dtos.filter((t) => {
      let currParentId = t.parent_id;
      while (currParentId !== null && currParentId !== undefined) {
        if (collapsedTaskIds.has(currParentId)) {
          return false;
        }
        const parentTask = idToTask.get(currParentId);
        currParentId = parentTask ? parentTask.parent_id : null;
      }
      return true;
    });
  }, [projectPayload, collapsedTaskIds]);

  // Handle multi-selection with Shift and Ctrl
  const handleSelectTask = useCallback(
    (id: number, e?: React.MouseEvent) => {
      if (e?.ctrlKey || e?.metaKey) {
        // Toggle selection
        setSelectedTaskIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
      } else if (e?.shiftKey && selectedTaskIds.length > 0 && projectPayload) {
        // Range selection
        const allIds = visibleTaskDtos.map((t) => t.id);
        const lastId = selectedTaskIds[selectedTaskIds.length - 1];
        const lastIdx = allIds.indexOf(lastId);
        const currIdx = allIds.indexOf(id);
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          const range = allIds.slice(start, end + 1);
          setSelectedTaskIds(Array.from(new Set([...selectedTaskIds, ...range])));
        } else {
          setSelectedTaskIds([id]);
        }
      } else {
        // Normal single select
        setSelectedTaskIds([id]);
      }
    },
    [selectedTaskIds, visibleTaskDtos, projectPayload]
  );

  const handleOpenTaskDetails = useCallback((taskId: number) => {
    setSelectedTaskIds([taskId]);
    setIsTaskDetailsOpen(true);
  }, []);

  // Actions
  const handleNew = async () => {
    try {
      const payload = await tauriApi.newProject();
      setProjectPayload(payload);
      setSelectedTaskIds(payload.task_dtos[0] ? [payload.task_dtos[0].id] : []);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleOpen = async () => {
    try {
      const payload = await tauriApi.openProjectDialog();
      if (payload) {
        setProjectPayload(payload);
        setSelectedTaskIds(payload.task_dtos[0] ? [payload.task_dtos[0].id] : []);
      }
    } catch (err: any) {
      alert(`Error al abrir: ${err}`);
    }
  };

  const handleSave = async () => {
    if (!projectPayload) return;
    try {
      const savedPath = await tauriApi.saveProjectDialog(projectPayload.data.file_path);
      if (savedPath) {
        setProjectPayload({
          ...projectPayload,
          data: { ...projectPayload.data, file_path: savedPath },
        });
      }
    } catch (err: any) {
      alert(`Error al guardar: ${err}`);
    }
  };

  const handleSaveAs = async () => {
    if (!projectPayload) return;
    try {
      const savedPath = await tauriApi.saveProjectAsDialog();
      if (savedPath) {
        setProjectPayload({
          ...projectPayload,
          data: { ...projectPayload.data, file_path: savedPath },
        });
      }
    } catch (err: any) {
      alert(`Error al guardar como: ${err}`);
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await tauriApi.exportCsvDialog();
      if (res) alert(`Archivo CSV exportado exitosamente a:\n${res}`);
    } catch (err: any) {
      alert(`Error al exportar CSV: ${err}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await tauriApi.exportExcelDialog();
      if (res) alert(`Archivo Excel (.xlsx) exportado exitosamente a:\n${res}`);
    } catch (err: any) {
      alert(`Error al exportar Excel: ${err}`);
    }
  };

  const handleImportXml = async () => {
    try {
      const payload = await tauriApi.importXmlDialog();
      if (payload) {
        setProjectPayload(payload);
        setSelectedTaskIds(payload.task_dtos[0] ? [payload.task_dtos[0].id] : []);
        alert('Proyecto MS Project XML importado correctamente.');
      }
    } catch (err: any) {
      alert(`Error al importar XML: ${err}`);
    }
  };

  const handleUndo = async () => {
    if (!projectPayload?.can_undo) return;
    try {
      const payload = await tauriApi.undo();
      setProjectPayload(payload);
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleRedo = async () => {
    if (!projectPayload?.can_redo) return;
    try {
      const payload = await tauriApi.redo();
      setProjectPayload(payload);
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleAddTask = async (name?: string) => {
    try {
      const payload = await tauriApi.addTask(selectedTaskId ?? undefined, name);
      setProjectPayload(payload);
      const last = payload.task_dtos[payload.task_dtos.length - 1];
      if (last) setSelectedTaskIds([last.id]);
    } catch (err: any) {
      alert(`Error al añadir tarea: ${err}`);
    }
  };

  const handleAddTasksBatch = async (taskInputs: { name: string; duration_hours?: number }[]) => {
    try {
      const payload = await tauriApi.addTasksBatch(taskInputs, selectedTaskId ?? undefined);
      setProjectPayload(payload);
      if (payload.task_dtos.length > 0) {
        setSelectedTaskIds([payload.task_dtos[payload.task_dtos.length - 1].id]);
      }
    } catch (err: any) {
      alert(`Error al importar tareas: ${err}`);
    }
  };

  const handleDeleteTask = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      const payload = await tauriApi.deleteTasks(selectedTaskIds);
      setProjectPayload(payload);
      setSelectedTaskIds(payload.task_dtos[0] ? [payload.task_dtos[0].id] : []);
    } catch (err: any) {
      alert(`Error al eliminar: ${err}`);
    }
  };

  const handleIndentTask = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      const payload = await tauriApi.indentTasks(selectedTaskIds);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error al indentar: ${err}`);
    }
  };

  const handleOutdentTask = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      const payload = await tauriApi.outdentTasks(selectedTaskIds);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error al desindentar: ${err}`);
    }
  };

  const handleSetTasksDuration = async (taskIds: number[], hours: number) => {
    try {
      const payload = await tauriApi.setTasksDuration(taskIds, hours);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error al cambiar duración: ${err}`);
    }
  };

  const handleUpdateTask = async (updated: Task) => {
    try {
      const payload = await tauriApi.updateTask(updated);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleSetPredecessors = async (taskId: number, expr: string) => {
    try {
      const payload = await tauriApi.setTaskPredecessors(taskId, expr);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error de dependencias: ${err}`);
    }
  };

  const handleAddDependency = async (predId: number, succId: number) => {
    try {
      const payload = await tauriApi.addDependency(predId, succId);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleSaveBaseline = async () => {
    try {
      const payload = await tauriApi.saveBaseline();
      setProjectPayload(payload);
      alert('Línea base guardada correctamente.');
    } catch (err: any) {
      alert(`Error de línea base: ${err}`);
    }
  };

  const handleClearBaseline = async () => {
    if (!confirm('¿Deseas borrar la línea base actual del proyecto?')) return;
    try {
      const payload = await tauriApi.clearBaseline();
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error al borrar línea base: ${err}`);
    }
  };

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, F2, Delete)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'F2' && selectedTaskId !== null) {
        e.preventDefault();
        setIsTaskDetailsOpen(true);
      } else if (e.key === 'Delete' && selectedTaskIds.length > 0 && !isInput) {
        e.preventDefault();
        handleDeleteTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectPayload, selectedTaskIds, selectedTaskId]);

  const handleSaveProjectSettings = async (settings: {
    name: string;
    schedule_from: 'START' | 'FINISH';
    project_start_date: string;
    hours_per_day: number;
    hours_per_week: number;
  }) => {
    if (!projectPayload) return;
    try {
      const updatedMeta = {
        ...projectPayload.data.meta,
        ...settings,
      };
      const updatedCalendar = {
        ...projectPayload.data.calendar,
        hours_per_day: settings.hours_per_day,
      };
      const payload = await tauriApi.updateCalendar(updatedCalendar, projectPayload.data.exceptions);
      setProjectPayload({
        ...payload,
        data: {
          ...payload.data,
          meta: updatedMeta,
        },
      });
      setIsSettingsOpen(false);
    } catch (err: any) {
      alert(`Error al guardar configuración: ${err}`);
    }
  };

  const handleSaveCalendar = async (
    calendar: Calendar,
    exceptions: CalendarException[],
  ) => {
    try {
      const payload = await tauriApi.updateCalendar(calendar, exceptions);
      setProjectPayload(payload);
      setIsCalendarOpen(false);
    } catch (err: any) {
      alert(`Error al guardar calendario: ${err}`);
    }
  };

  const handleSaveTaskDetails = (task: Task) => {
    handleUpdateTask(task);
  };

  const handleExportPng = () => {
    const svg = document.getElementById('gantt-svg-root');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const svgSize = svg.getBoundingClientRect();
    canvas.width = svgSize.width * 2;
    canvas.height = svgSize.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = darkMode ? '#0a0a0a' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = `Gantt_${projectPayload?.data.meta.name || 'Proyecto'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleExportSvg = () => {
    const svg = document.getElementById('gantt-svg-root');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `Gantt_${projectPayload?.data.meta.name || 'Proyecto'}.svg`;
    a.href = url;
    a.click();
  };

  const handlePrintPdf = (mode: 'ALL' | 'TABLE' | 'GANTT') => {
    setIsExportPdfOpen(false);

    document.body.classList.remove('print-mode-table', 'print-mode-gantt', 'print-mode-all');
    if (mode === 'TABLE') {
      document.body.classList.add('print-mode-table');
    } else if (mode === 'GANTT') {
      document.body.classList.add('print-mode-gantt');
    } else {
      document.body.classList.add('print-mode-all');
    }

    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (!projectPayload) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900 text-neutral-200">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-sm font-medium">Cargando motor de Easy Project...</p>
        </div>
      </div>
    );
  }

  const selectedTask = visibleTaskDtos.find((t) => t.id === selectedTaskId) || projectPayload.task_dtos.find((t) => t.id === selectedTaskId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-neutral-950 font-sans">
      {/* Top Application Ribbon */}
      <Toolbar
        projectName={projectPayload.data.meta.name}
        filePath={projectPayload.data.file_path}
        calculationMs={projectPayload.calculation_ms}
        canUndo={projectPayload.can_undo}
        canRedo={projectPayload.can_redo}
        activeView={activeView}
        zoomLevel={zoomLevel}
        darkMode={darkMode}
        hasSelectedTask={selectedTaskIds.length > 0}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        onImportXml={handleImportXml}
        onOpenPdfModal={() => setIsExportPdfOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCalendarModal={() => setIsCalendarOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onIndentTask={handleIndentTask}
        onOutdentTask={handleOutdentTask}
        onSaveBaseline={handleSaveBaseline}
        onClearBaseline={handleClearBaseline}
        onViewChange={setActiveView}
        onZoomChange={setZoomLevel}
        onToggleTheme={() => setDarkMode(!darkMode)}
        language={language}
        onToggleLanguage={toggleLanguage}
      />

      {/* Main Workspace View */}
      <main className="flex-1 overflow-hidden relative flex">
        {activeView === 'GANTT' ? (
          <SplitPane
            initialLeftWidth={540}
            left={({ scrollRef, onScroll }) => (
              <TaskSheet
                tasks={visibleTaskDtos}
                selectedTaskIds={selectedTaskIds}
                collapsedTaskIds={collapsedTaskIds}
                hoursPerDay={projectPayload.data.meta.hours_per_day}
                language={language}
                onSelectTask={handleSelectTask}
                onToggleCollapse={toggleCollapse}
                onOpenTaskDetails={handleOpenTaskDetails}
                onUpdateTask={handleUpdateTask}
                onSetTasksDuration={handleSetTasksDuration}
                onSetPredecessors={handleSetPredecessors}
                onAddTask={handleAddTask}
                onAddTasksBatch={handleAddTasksBatch}
                scrollRef={scrollRef}
                onScroll={onScroll}
              />
            )}
            right={({ scrollRef, onScroll }) => (
              <GanttChart
                tasks={visibleTaskDtos}
                dependencies={projectPayload.data.dependencies}
                zoomLevel={zoomLevel}
                selectedTaskId={selectedTaskId}
                hoursPerDay={projectPayload.data.meta.hours_per_day}
                projectStartDate={projectPayload.data.meta.project_start_date}
                onSelectTask={(id) => handleSelectTask(id)}
                onUpdateTask={handleUpdateTask}
                onAddDependency={handleAddDependency}
                scrollRef={scrollRef}
                onScroll={onScroll}
              />
            )}
          />
        ) : (
          <CalendarView
            tasks={visibleTaskDtos}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => handleSelectTask(id)}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        tasks={visibleTaskDtos}
        selectedTaskIds={selectedTaskIds}
        scheduleFrom={projectPayload.data.meta.schedule_from}
        calculationMs={projectPayload.calculation_ms}
        language={language}
      />

      {/* Modals */}
      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        meta={projectPayload.data.meta}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveProjectSettings}
      />

      <TaskDetailsModal
        isOpen={isTaskDetailsOpen}
        task={selectedTask}
        allTasks={projectPayload.task_dtos}
        dependencies={projectPayload.data.dependencies}
        hoursPerDay={projectPayload.data.meta.hours_per_day}
        onClose={() => setIsTaskDetailsOpen(false)}
        onSave={handleSaveTaskDetails}
      />

      <ExportPdfModal
        isOpen={isExportPdfOpen}
        onClose={() => setIsExportPdfOpen(false)}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onPrintPdf={handlePrintPdf}
      />

      <CalendarSettingsModal
        isOpen={isCalendarOpen}
        calendar={projectPayload.data.calendar}
        exceptions={projectPayload.data.exceptions}
        onClose={() => setIsCalendarOpen(false)}
        onSave={handleSaveCalendar}
      />
    </div>
  );
};

export default App;
