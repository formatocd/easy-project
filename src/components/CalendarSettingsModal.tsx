import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Calendar, CalendarException } from '../types/project';

interface CalendarSettingsModalProps {
  calendar: Calendar;
  exceptions: CalendarException[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (calendar: Calendar, exceptions: CalendarException[]) => void;
}

export const CalendarSettingsModal: React.FC<CalendarSettingsModalProps> = ({
  calendar,
  exceptions,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  // Calendar weekly hours
  const [monHours, setMonHours] = useState(calendar.mon_hours);
  const [tueHours, setTueHours] = useState(calendar.tue_hours);
  const [wedHours, setWedHours] = useState(calendar.wed_hours);
  const [thuHours, setThuHours] = useState(calendar.thu_hours);
  const [friHours, setFriHours] = useState(calendar.fri_hours);
  const [satHours, setSatHours] = useState(calendar.sat_hours);
  const [sunHours, setSunHours] = useState(calendar.sun_hours);

  // Exceptions list
  const [excList, setExcList] = useState<CalendarException[]>(exceptions);
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsWorking] = useState(false);
  const [newHours] = useState(0);

  const handleAddException = () => {
    if (!newDate) return;
    const item: CalendarException = {
      id: `exc-${Date.now()}`,
      calendar_id: calendar.id,
      exception_date: newDate,
      is_working: newIsWorking,
      working_hours: newIsWorking ? Number(newHours) : 0,
      description: newDesc.trim() || (newIsWorking ? 'Jornada especial' : 'Día festivo / No laborable'),
    };
    setExcList([...excList, item]);
    setNewDate('');
    setNewDesc('');
  };

  const handleRemoveException = (id: string) => {
    setExcList(excList.filter((e) => e.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        ...calendar,
        mon_hours: Number(monHours),
        tue_hours: Number(tueHours),
        wed_hours: Number(wedHours),
        thu_hours: Number(thuHours),
        fri_hours: Number(friHours),
        sat_hours: Number(satHours),
        sun_hours: Number(sunHours),
      },
      excList,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none">
      <div className="w-[520px] max-h-[85vh] bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xl flex flex-col text-neutral-800 dark:text-neutral-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/80">
          <div className="flex items-center space-x-2 font-semibold text-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Calendario Laboral del Proyecto</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Weekly Work Hours */}
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Jornada semanal estándar (horas por día)
            </h3>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {[
                { label: 'Lun', val: monHours, set: setMonHours },
                { label: 'Mar', val: tueHours, set: setTueHours },
                { label: 'Mié', val: wedHours, set: setWedHours },
                { label: 'Jue', val: thuHours, set: setThuHours },
                { label: 'Vie', val: friHours, set: setFriHours },
                { label: 'Sáb', val: satHours, set: setSatHours },
                { label: 'Dom', val: sunHours, set: setSunHours },
              ].map((d, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[11px] font-medium text-neutral-500 mb-1">{d.label}</span>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={d.val}
                    onChange={(e) => d.set(Number(e.target.value))}
                    className={`w-full py-1 text-center font-semibold rounded border text-xs ${
                      d.val > 0
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Exceptions & Holidays */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Festivos y Excepciones del Proyecto
            </h3>
            <span className="text-neutral-500 text-[11px] block mb-2">
              Los días marcados como no laborables se saltarán automáticamente en el cronograma.
            </span>

            {/* Add Exception Row */}
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripción (ej. Navidad)"
                className="flex-1 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
              />
              <button
                type="button"
                onClick={handleAddException}
                disabled={!newDate}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>

            {/* List */}
            {excList.length === 0 ? (
              <div className="p-4 text-center text-neutral-400 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md">
                No hay festivos ni excepciones configuradas.
              </div>
            ) : (
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-200 dark:divide-neutral-800 max-h-36 overflow-y-auto">
                {excList.map((exc) => (
                  <div key={exc.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-neutral-500">{exc.exception_date}</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        {exc.description || 'Festivo'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {exc.is_working ? `${exc.working_hours}h` : 'No laborable'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveException(exc.id)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
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
              Guardar Calendario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
