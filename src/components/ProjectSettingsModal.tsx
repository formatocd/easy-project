import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { ProjectMeta, ScheduleFrom } from '../types/project';
import { formatDateTime } from '../utils/formatters';

interface ProjectSettingsModalProps {
  meta: ProjectMeta;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMeta: ProjectMeta) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  meta,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(meta.name);
  const [scheduleFrom, setScheduleFrom] = useState<ScheduleFrom>(meta.schedule_from);
  const [startDate, setStartDate] = useState(meta.project_start_date.slice(0, 16));
  const [hoursPerDay, setHoursPerDay] = useState(meta.hours_per_day);
  const [currencySymbol, setCurrencySymbol] = useState(meta.currency_symbol);

  useEffect(() => {
    if (isOpen) {
      setName(meta.name);
      setScheduleFrom(meta.schedule_from);
      setStartDate(meta.project_start_date.slice(0, 16));
      setHoursPerDay(meta.hours_per_day);
      setCurrencySymbol(meta.currency_symbol);
    }
  }, [isOpen, meta]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...meta,
      name,
      schedule_from: scheduleFrom,
      project_start_date: startDate.length === 16 ? `${startDate}:00` : startDate,
      hours_per_day: Math.max(1, Number(hoursPerDay)),
      currency_symbol: currencySymbol,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-[480px] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xl overflow-hidden text-neutral-800 dark:text-neutral-200 text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/80">
          <div className="flex items-center space-x-2 font-semibold text-sm">
            <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Información del Proyecto</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
              Nombre del proyecto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Programar a partir de
              </label>
              <select
                value={scheduleFrom}
                onChange={(e) => setScheduleFrom(e.target.value as ScheduleFrom)}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="START">Fecha de comienzo (Hacia adelante)</option>
                <option value="FINISH">Fecha de fin (Hacia atrás)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Fecha de comienzo
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Horas por jornada laboral
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-neutral-500">h/día</span>
              </div>
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Símbolo de moneda
              </label>
              <input
                type="text"
                maxLength={4}
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {meta.project_finish_date && (
            <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-[11px]">
              Fecha de finalización estimada:{' '}
              <strong>{formatDateTime(meta.project_finish_date)}</strong>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium"
            >
              Aceptar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
