import React, { useState } from 'react';
import { X, Printer, Image, FileCode } from 'lucide-react';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onPrintPdf: (config: { content: 'both' | 'table' | 'gantt'; orientation: 'landscape' | 'portrait'; paper: string }) => void;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  onExportPng,
  onExportSvg,
  onPrintPdf,
}) => {
  const [content, setContent] = useState<'both' | 'table' | 'gantt'>('both');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [paper, setPaper] = useState('A4');

  if (!isOpen) return null;

  const handlePrint = () => {
    onPrintPdf({ content, orientation, paper });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-[500px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xl overflow-hidden text-neutral-800 dark:text-neutral-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/80">
          <div className="flex items-center space-x-2 font-semibold text-sm">
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Asistente de Exportación e Impresión</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* 1. Content Selector */}
          <div>
            <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1.5">
              1. Contenido a incluir en el documento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setContent('both');
                  setOrientation('landscape');
                }}
                className={`py-2 px-3 rounded border text-center font-medium transition ${
                  content === 'both'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Tabla + Gantt
              </button>

              <button
                type="button"
                onClick={() => setContent('table')}
                className={`py-2 px-3 rounded border text-center font-medium transition ${
                  content === 'table'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Solo Tabla
              </button>

              <button
                type="button"
                onClick={() => {
                  setContent('gantt');
                  setOrientation('landscape');
                }}
                className={`py-2 px-3 rounded border text-center font-medium transition ${
                  content === 'gantt'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                Solo Gantt
              </button>
            </div>
          </div>

          {/* 2. Format & Orientation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                2. Tamaño de papel
              </label>
              <select
                value={paper}
                onChange={(e) => setPaper(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A3">A3 (297 × 420 mm)</option>
                <option value="Letter">Carta (Letter)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Orientación
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 cursor-pointer"
              >
                <option value="landscape">Apaisado (Horizontal - Recomendado)</option>
                <option value="portrait">Vertical (Retrato)</option>
              </select>
            </div>
          </div>

          {/* Quick Graphics Actions */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <span className="block text-neutral-500 text-[11px] mb-2">
              Exportación gráfica directa del Diagrama de Gantt:
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  onExportPng();
                  onClose();
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium"
              >
                <Image className="w-3.5 h-3.5 text-emerald-500" />
                <span>Descargar PNG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onExportSvg();
                  onClose();
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium"
              >
                <FileCode className="w-3.5 h-3.5 text-blue-500" />
                <span>Descargar Vector SVG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Generar Documento PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
