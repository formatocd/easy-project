import React, { useEffect, useState, useCallback } from 'react';
import { ActiveView, Dependency, ProjectPayload, Task, ZoomLevel } from './types/project';
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

export const App: React.FC = () => {
  const [projectPayload, setProjectPayload] = useState<ProjectPayload | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('GANTT');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('DAYS');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // Sync dark class on body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load project initially
  const loadProject = useCallback(async () => {
    try {
      const payload = await tauriApi.getProject();
      setProjectPayload(payload);
      if (payload.task_dtos.length > 0 && selectedTaskId === null) {
        setSelectedTaskId(payload.task_dtos[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y, F2)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectPayload, selectedTaskId]);

  // Actions
  const handleNew = async () => {
    try {
      const payload = await tauriApi.newProject();
      setProjectPayload(payload);
      setSelectedTaskId(payload.task_dtos[0]?.id ?? null);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleOpen = async () => {
    try {
      const payload = await tauriApi.openProjectDialog();
      if (payload) {
        setProjectPayload(payload);
        setSelectedTaskId(payload.task_dtos[0]?.id ?? null);
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
    try {
      const savedPath = await tauriApi.saveProjectAsDialog();
      if (savedPath && projectPayload) {
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
      const savedPath = await tauriApi.exportCsvDialog();
      if (savedPath) {
        alert(`Exportación a CSV completada con éxito:\n${savedPath}`);
      }
    } catch (err: any) {
      alert(`Error al exportar CSV: ${err}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      const savedPath = await tauriApi.exportExcelDialog();
      if (savedPath) {
        alert(`Exportación a Excel (.xlsx) completada con éxito:\n${savedPath}`);
      }
    } catch (err: any) {
      alert(`Error al exportar Excel: ${err}`);
    }
  };

  const handleImportXml = async () => {
    try {
      const payload = await tauriApi.importXmlDialog();
      if (payload) {
        setProjectPayload(payload);
        setSelectedTaskId(payload.task_dtos[0]?.id ?? null);
        alert(`Proyecto importado con éxito (${payload.task_dtos.length} tareas cargadas).`);
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

  const handleAddTask = async () => {
    try {
      const payload = await tauriApi.addTask(selectedTaskId ?? undefined);
      setProjectPayload(payload);
      const last = payload.task_dtos[payload.task_dtos.length - 1];
      if (last) setSelectedTaskId(last.id);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleDeleteTask = async () => {
    if (selectedTaskId === null) return;
    try {
      const payload = await tauriApi.deleteTask(selectedTaskId);
      setProjectPayload(payload);
      setSelectedTaskId(payload.task_dtos[0]?.id ?? null);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleIndentTask = async () => {
    if (selectedTaskId === null) return;
    try {
      const payload = await tauriApi.indentTask(selectedTaskId);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleOutdentTask = async () => {
    if (selectedTaskId === null) return;
    try {
      const payload = await tauriApi.outdentTask(selectedTaskId);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error: ${err}`);
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
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleClearBaseline = async () => {
    try {
      const payload = await tauriApi.clearBaseline();
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleSaveProjectSettings = async (updatedMeta: any) => {
    if (!projectPayload) return;
    try {
      // Re-save meta and recalculate
      const updated = {
        ...projectPayload.data,
        meta: updatedMeta,
      };
      // We can update task start dates or trigger recalculate
      const payload = await tauriApi.updateTask(projectPayload.data.tasks[0]);
      setProjectPayload({
        ...payload,
        data: { ...payload.data, meta: updatedMeta },
      });
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleSaveTaskDetails = async (updatedTask: Task, updatedPredecessors: Dependency[]) => {
    try {
      // 1. Update task
      let payload = await tauriApi.updateTask(updatedTask);
      // 2. Format predecessors shorthand
      const expr = updatedPredecessors
        .map((d) => d.predecessor_id)
        .join(', ');
      payload = await tauriApi.setTaskPredecessors(updatedTask.id, expr);
      setProjectPayload(payload);
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  // Graphical Exports (PNG / SVG / PDF)
  const handleExportPng = () => {
    const el = document.getElementById('gantt-canvas-container');
    if (!el) return;
    window.print();
  };

  const handleExportSvg = () => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectPayload?.data.meta.name || 'Gantt'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = (config: {
    content: 'both' | 'table' | 'gantt';
    orientation: 'landscape' | 'portrait';
    paper: string;
  }) => {
    setIsExportPdfOpen(false);

    document.body.classList.remove('print-table-only', 'print-gantt-only', 'print-both');
    if (config.content === 'table') {
      document.body.classList.add('print-table-only');
    } else if (config.content === 'gantt') {
      document.body.classList.add('print-gantt-only');
    } else {
      document.body.classList.add('print-both');
    }

    let styleEl = document.getElementById('print-page-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'print-page-style';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { size: ${config.paper} ${config.orientation}; margin: 10mm; }`;

    setTimeout(() => {
      window.print();
      document.body.classList.remove('print-table-only', 'print-gantt-only', 'print-both');
    }, 200);
  };

  if (!projectPayload) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Iniciando Easy Project...</span>
        </div>
      </div>
    );
  }

  const selectedTask = projectPayload.task_dtos.find((t) => t.id === selectedTaskId) || null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
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
        hasSelectedTask={selectedTaskId !== null}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        onImportXml={handleImportXml}
        onOpenPdfModal={() => setIsExportPdfOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
      />

      {/* Main Workspace View */}
      <main className="flex-1 overflow-hidden relative flex">
        {activeView === 'GANTT' ? (
          <SplitPane
            initialLeftWidth={520}
            left={({ scrollRef, onScroll }) => (
              <TaskSheet
                tasks={projectPayload.task_dtos}
                selectedTaskId={selectedTaskId}
                hoursPerDay={projectPayload.data.meta.hours_per_day}
                onSelectTask={(id) => {
                  if (selectedTaskId === id) {
                    setIsTaskDetailsOpen(true);
                  } else {
                    setSelectedTaskId(id);
                  }
                }}
                onUpdateTask={handleUpdateTask}
                onSetPredecessors={handleSetPredecessors}
                onAddTaskBelow={handleAddTask}
                scrollRef={scrollRef}
                onScroll={onScroll}
              />
            )}
            right={({ scrollRef, onScroll }) => (
              <GanttChart
                tasks={projectPayload.task_dtos}
                dependencies={projectPayload.data.dependencies}
                zoomLevel={zoomLevel}
                selectedTaskId={selectedTaskId}
                hoursPerDay={projectPayload.data.meta.hours_per_day}
                projectStartDate={projectPayload.data.meta.project_start_date}
                onSelectTask={(id) => {
                  if (selectedTaskId === id) {
                    setIsTaskDetailsOpen(true);
                  } else {
                    setSelectedTaskId(id);
                  }
                }}
                onUpdateTask={handleUpdateTask}
                onAddDependency={handleAddDependency}
                scrollRef={scrollRef}
                onScroll={onScroll}
              />
            )}
          />
        ) : (
          <CalendarView
            tasks={projectPayload.task_dtos}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <StatusBar
        tasks={projectPayload.task_dtos}
        selectedTaskId={selectedTaskId}
        scheduleFrom={projectPayload.data.meta.schedule_from}
        calculationMs={projectPayload.calculation_ms}
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
    </div>
  );
};

export default App;
