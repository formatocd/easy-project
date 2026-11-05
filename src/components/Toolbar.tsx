import React, { useState } from 'react';
import {
  FolderOpen,
  Save,
  Plus,
  Trash2,
  Indent,
  Outdent,
  Undo2,
  Redo2,
  BookmarkPlus,
  BookmarkX,
  Calendar as CalendarIcon,
  BarChart2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  FilePlus,
  FileSpreadsheet,
  FileText,
  FileUp,
  Printer,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { ActiveView, ZoomLevel } from '../types/project';

interface ToolbarProps {
  projectName: string;
  filePath: string | null;
  calculationMs: number;
  canUndo: boolean;
  canRedo: boolean;
  activeView: ActiveView;
  zoomLevel: ZoomLevel;
  darkMode: boolean;
  hasSelectedTask: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onImportXml: () => void;
  onOpenPdfModal: () => void;
  onOpenSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddTask: () => void;
  onDeleteTask: () => void;
  onIndentTask: () => void;
  onOutdentTask: () => void;
  onSaveBaseline: () => void;
  onClearBaseline: () => void;
  onViewChange: (view: ActiveView) => void;
  onZoomChange: (zoom: ZoomLevel) => void;
  onToggleTheme: () => void;
}

const ZOOM_LEVELS: ZoomLevel[] = ['HOURS', 'DAYS', 'WEEKS', 'MONTHS', 'YEARS'];

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName,
  filePath,
  calculationMs,
  canUndo,
  canRedo,
  activeView,
  zoomLevel,
  darkMode,
  hasSelectedTask,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportCsv,
  onExportExcel,
  onImportXml,
  onOpenPdfModal,
  onOpenSettings,
  onUndo,
  onRedo,
  onAddTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onSaveBaseline,
  onClearBaseline,
  onViewChange,
  onZoomChange,
  onToggleTheme,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const currentZoomIdx = ZOOM_LEVELS.indexOf(zoomLevel);

  const handleZoomIn = () => {
    if (currentZoomIdx > 0) {
      onZoomChange(ZOOM_LEVELS[currentZoomIdx - 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIdx < ZOOM_LEVELS.length - 1) {
      onZoomChange(ZOOM_LEVELS[currentZoomIdx + 1]);
    }
  };

  return (
    <header className="relative z-50 border-b border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 select-none text-neutral-800 dark:text-neutral-200 shadow-xs">
      {/* Top Application Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800 text-xs">
        <div className="flex items-center space-x-2 font-semibold">
          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
            EP
          </div>
          <span>Easy Project</span>
          <span className="text-neutral-400">|</span>
          <button
            onClick={onOpenSettings}
            className="hover:underline flex items-center gap-1 font-normal text-neutral-600 dark:text-neutral-400"
            title="Configurar propiedades del proyecto"
          >
            <span>{projectName}</span>
            <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
            <span className="text-neutral-400 text-[11px]">{filePath ? `(${filePath})` : '(No guardado)'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {calculationMs > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              {calculationMs.toFixed(2)} ms
            </span>
          )}

          <button
            onClick={onToggleTheme}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            title="Alternar Tema Claro / Oscuro"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Ribbon Actions Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs gap-2 relative">
        {/* Left Section: File & History */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Nuevo proyecto"
          >
            <FilePlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Nuevo</span>
          </button>

          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Abrir archivo (.epr)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Abrir</span>
          </button>

          <button
            onClick={onSave}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Guardar cambios (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Guardar</span>
          </button>

          <button
            onClick={onSaveAs}
            className="px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Guardar como..."
          >
            Como...
          </button>

          {/* Interoperability / Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 font-medium text-neutral-700 dark:text-neutral-300"
              title="Importar y Exportar datos"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Intercambio</span>
            </button>

            {showExportMenu && (
              <>
                {/* Backdrop to close on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />

                <div
                  className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-2xl z-50 py-1 text-xs"
                >
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportExcel();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-800 dark:text-neutral-200"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exportar a Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCsv();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-800 dark:text-neutral-200"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Exportar a CSV (.csv)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onOpenPdfModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-800 dark:text-neutral-200"
                  >
                    <Printer className="w-4 h-4 text-indigo-500" />
                    <span>Asistente PDF / Gráfica...</span>
                  </button>

                  <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onImportXml();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Importar MS Project XML</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />

          {/* History */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded ${
              canUndo
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                : 'opacity-40 cursor-not-allowed text-neutral-400'
            }`}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded ${
              canRedo
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                : 'opacity-40 cursor-not-allowed text-neutral-400'
            }`}
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />

          {/* Task Editing */}
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            title="Insertar nueva tarea"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Tarea</span>
          </button>

          <button
            onClick={onDeleteTask}
            disabled={!hasSelectedTask}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
              hasSelectedTask
                ? 'hover:bg-red-100 text-red-600 dark:hover:bg-red-950 dark:text-red-400'
                : 'opacity-40 cursor-not-allowed'
            }`}
            title="Eliminar tarea seleccionada"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar</span>
          </button>

          <button
            onClick={onOutdentTask}
            disabled={!hasSelectedTask}
            className={`p-1.5 rounded ${
              hasSelectedTask
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                : 'opacity-40 cursor-not-allowed'
            }`}
            title="Sangría izquierda (Desindentar / Subir nivel WBS)"
          >
            <Outdent className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
          </button>

          <button
            onClick={onIndentTask}
            disabled={!hasSelectedTask}
            className={`p-1.5 rounded ${
              hasSelectedTask
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                : 'opacity-40 cursor-not-allowed'
            }`}
            title="Sangría derecha (Indentar / Convertir en subtarea)"
          >
            <Indent className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />

          {/* Baseline Actions */}
          <button
            onClick={onSaveBaseline}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Guardar o actualizar Línea Base del proyecto"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Fijar Línea Base</span>
          </button>

          <button
            onClick={onClearBaseline}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            title="Borrar Línea Base"
          >
            <BookmarkX className="w-3.5 h-3.5" />
            <span>Borrar</span>
          </button>
        </div>

        {/* Right Section: Views & Zoom */}
        <div className="flex items-center space-x-2">
          {/* View Switcher */}
          <div className="flex bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-300 dark:border-neutral-700">
            <button
              onClick={() => onViewChange('GANTT')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeView === 'GANTT'
                  ? 'bg-white dark:bg-neutral-900 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Gantt</span>
            </button>

            <button
              onClick={() => onViewChange('CALENDAR')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeView === 'CALENDAR'
                  ? 'bg-white dark:bg-neutral-900 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
          </div>

          {/* Zoom Controls (Active in Gantt) */}
          {activeView === 'GANTT' && (
            <div className="flex items-center space-x-1 pl-1">
              <button
                onClick={handleZoomIn}
                disabled={currentZoomIdx === 0}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-40"
                title="Acercar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <select
                value={zoomLevel}
                onChange={(e) => onZoomChange(e.target.value as ZoomLevel)}
                className="bg-neutral-200 dark:bg-neutral-800 border-none rounded px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
              >
                <option value="HOURS">Horas</option>
                <option value="DAYS">Días</option>
                <option value="WEEKS">Semanas</option>
                <option value="MONTHS">Meses</option>
                <option value="YEARS">Años</option>
              </select>

              <button
                onClick={handleZoomOut}
                disabled={currentZoomIdx === ZOOM_LEVELS.length - 1}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-40"
                title="Alejar Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
