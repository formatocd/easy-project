import { ZoomLevel } from '../types/project';

export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatDateShort(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDuration(hours: number, hoursPerDay = 8): string {
  if (hours <= 0) return '0d';
  if (Math.abs(hours % hoursPerDay) < 0.001) {
    const days = hours / hoursPerDay;
    return `${days}d`;
  }
  return `${Number(hours.toFixed(1))}h`;
}

export function parseDurationInput(input: string, hoursPerDay = 8): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  let numStr = '';
  let unit = 'd';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch >= '0' && ch <= '9') || ch === '.' || ch === ',') {
      numStr += ch === ',' ? '.' : ch;
    } else if (ch === 'd' || ch === 'h' || ch === 'w' || ch === 'm') {
      unit = ch;
    }
  }

  const val = parseFloat(numStr);
  if (isNaN(val)) return null;

  switch (unit) {
    case 'h':
      return val;
    case 'w':
      return val * hoursPerDay * 5;
    case 'm':
      return val * hoursPerDay * 20;
    case 'd':
    default:
      return val * hoursPerDay;
  }
}

export function getZoomColumnWidth(zoom: ZoomLevel): number {
  switch (zoom) {
    case 'HOURS':
      return 45; // 45px per hour
    case 'DAYS':
      return 36; // 36px per day
    case 'WEEKS':
      return 70; // 70px per week
    case 'MONTHS':
      return 100; // 100px per month
    case 'YEARS':
      return 120; // 120px per year/quarter
  }
}

export function getPixelsPerHour(zoom: ZoomLevel, hoursPerDay = 8): number {
  switch (zoom) {
    case 'HOURS':
      return 45;
    case 'DAYS':
      return 36 / 24; // 1.5 px per hour
    case 'WEEKS':
      return 70 / (7 * 24); // ~0.41 px per hour
    case 'MONTHS':
      return 100 / (30 * 24);
    case 'YEARS':
      return 120 / (365 * 24);
  }
}
