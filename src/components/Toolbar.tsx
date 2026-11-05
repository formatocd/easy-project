import React, { useState } from 'react';
import {
  FolderOpen,
  FolderDown,
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
  ChevronDown,
} from 'lucide-react';
import { ActiveView, ZoomLevel } from '../types/project';
import { Language, translations, SUPPORTED_LANGUAGES } from '../i18n/translations';

interface ToolbarProps {
  projectName: string;
  filePath: string | null;
  calculationMs: number;
  canUndo: boolean;
  canRedo: boolean;
  activeView: ActiveView;
  zoomLevel: ZoomLevel;
  darkMode: boolean;
  language: Language;
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
  onOpenCalendarModal: () => void;
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
  onSelectLanguage: (lang: Language) => void;
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
  language,
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
  onOpenCalendarModal,
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
  onSelectLanguage,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = translations[language];
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
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
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-800 text-xs gap-2">
        <div className="flex items-center space-x-2 font-semibold min-w-0 shrink">
          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
            EP
          </div>
          <span className="shrink-0">Easy Project</span>
          <span className="text-neutral-400 shrink-0">|</span>
          <button
            onClick={onOpenSettings}
            className="hover:underline flex items-center gap-1 font-normal text-neutral-600 dark:text-neutral-400 min-w-0 truncate"
            title="Configurar propiedades del proyecto"
          >
            <span className="truncate max-w-[200px]">{projectName}</span>
            <SlidersHorizontal className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="text-neutral-400 text-[11px] truncate shrink-0">{filePath ? `(${filePath})` : '(No guardado)'}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {calculationMs > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              {calculationMs.toFixed(2)} ms
            </span>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 transition"
              title={t.selectLanguage}
            >
              <span className="text-xs">{currentLang.flag}</span>
              <span className="font-semibold">{currentLang.code.toUpperCase()}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showLangMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLangMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-2xl z-50 py-1 text-xs">
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition ${
                        language === l.code
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.name}</span>
                      </span>
                      {language === l.code && <span className="text-blue-500 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onToggleTheme}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            title={t.themeToggle}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Ribbon Actions Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs gap-2 relative overflow-x-auto scrollbar-none">
        {/* Left Section: File & History */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 shrink-0 whitespace-nowrap"
            title={t.new}
          >
            <FilePlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden xl:inline">{t.new}</span>
          </button>

          <button
            onClick={onOpen}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 shrink-0 whitespace-nowrap"
            title={t.open}
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden xl:inline">{t.open}</span>
          </button>

          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 shrink-0 whitespace-nowrap"
            title={t.save}
          >
            <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">{t.save}</span>
          </button>

          <button
            onClick={onSaveAs}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0 whitespace-nowrap"
            title={t.saveAs}
          >
            <FolderDown className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden 2xl:inline">{t.saveAs}</span>
          </button>

          {/* Interoperability / Export Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 font-medium text-neutral-700 dark:text-neutral-300 shrink-0 whitespace-nowrap"
              title={t.exchange}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden lg:inline">{t.exchange}</span>
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
                    <span>{t.exportExcel}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportCsv();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-800 dark:text-neutral-200"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{t.exportCsv}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onOpenPdfModal();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-800 dark:text-neutral-200"
                  >
                    <Printer className="w-4 h-4 text-indigo-500" />
                    <span>{t.pdfAssistant}</span>
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
                    <span>{t.importXml}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />

          {/* History */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded shrink-0 ${
              canUndo
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                : 'opacity-40 cursor-not-allowed text-neutral-400'
            }`}
            title={t.undo}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded shrink-0 ${
              canRedo
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                : 'opacity-40 cursor-not-allowed text-neutral-400'
            }`}
            title={t.redo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />

          {/* Task Editing */}
          <button
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium shrink-0 whitespace-nowrap"
            title={t.addTask}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.addTask}</span>
          </button>

          <button
            onClick={onDeleteTask}
            disabled={!hasSelectedTask}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded shrink-0 whitespace-nowrap ${
              hasSelectedTask
                ? 'hover:bg-red-100 text-red-600 dark:hover:bg-red-950 dark:text-red-400'
                : 'opacity-40 cursor-not-allowed'
            }`}
            title={t.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t.delete}</span>
          </button>

          <button
            onClick={onOutdentTask}
            disabled={!hasSelectedTask}
            className={`p-1.5 rounded shrink-0 ${
              hasSelectedTask
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                : 'opacity-40 cursor-not-allowed'
            }`}
            title={t.outdent}
          >
            <Outdent className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
          </button>

          <button
            onClick={onIndentTask}
            disabled={!hasSelectedTask}
            className={`p-1.5 rounded shrink-0 ${
              hasSelectedTask
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
                : 'opacity-40 cursor-not-allowed'
            }`}
            title={t.indent}
          >
            <Indent className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />

          {/* Baseline Actions */}
          <button
            onClick={onSaveBaseline}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 shrink-0 whitespace-nowrap"
            title={t.baseline}
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden xl:inline">{t.baseline}</span>
          </button>

          <button
            onClick={onClearBaseline}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0"
            title={t.clearBaseline}
          >
            <BookmarkX className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700 mx-1 shrink-0" />

          {/* Project Calendar & Holidays */}
          <button
            onClick={onOpenCalendarModal}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0 whitespace-nowrap"
            title={t.calendarHolidays}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden 2xl:inline">{t.calendarHolidays}</span>
          </button>
        </div>

        {/* Right Section: Views & Zoom */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* View Switcher */}
          <div className="flex bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shrink-0">
            <button
              onClick={() => onViewChange('GANTT')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeView === 'GANTT'
                  ? 'bg-white dark:bg-neutral-900 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title={t.ganttView}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.ganttView}</span>
            </button>

            <button
              onClick={() => onViewChange('CALENDAR')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeView === 'CALENDAR'
                  ? 'bg-white dark:bg-neutral-900 shadow-sm text-blue-600 dark:text-blue-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
              title={t.calendarView}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.calendarView}</span>
            </button>
          </div>

          {/* Zoom Controls (Active in Gantt) */}
          {activeView === 'GANTT' && (
            <div className="flex items-center space-x-1 pl-1 shrink-0">
              <button
                onClick={handleZoomIn}
                disabled={currentZoomIdx === 0}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-40 shrink-0"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <select
                value={zoomLevel}
                onChange={(e) => onZoomChange(e.target.value as ZoomLevel)}
                className="bg-neutral-200 dark:bg-neutral-800 border-none rounded px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer shrink-0"
              >
                <option value="HOURS">{t.hours}</option>
                <option value="DAYS">{t.days}</option>
                <option value="WEEKS">{t.weeks}</option>
                <option value="MONTHS">{t.months}</option>
                <option value="YEARS">{t.years}</option>
              </select>

              <button
                onClick={handleZoomOut}
                disabled={currentZoomIdx === ZOOM_LEVELS.length - 1}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-40 shrink-0"
                title="Zoom Out"
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
