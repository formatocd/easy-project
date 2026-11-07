import React from 'react';
import { X, ExternalLink, Mail, Code, Shield, Sparkles } from 'lucide-react';
import { Language } from '../i18n/translations';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleOpenLink = async (url: string) => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  };

  const technologies = [
    'Tauri 2',
    'Rust',
    'React 19',
    'TypeScript',
    'Tailwind CSS',
    'SQLite',
    'Motor CPM / Ruta Crítica',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-800 dark:text-neutral-200 text-xs animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80">
          <div className="flex items-center space-x-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Acerca de Easy Project</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="p-6 text-center border-b border-neutral-100 dark:border-neutral-800/80 bg-gradient-to-b from-blue-50/40 via-transparent to-transparent dark:from-blue-950/20">
          <div className="inline-block relative mb-3">
            <img
              src="/logo.jpg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/app-icon.png';
              }}
              alt="Easy Project Logo"
              className="w-20 h-20 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700/80 object-cover mx-auto"
            />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Easy Project
          </h2>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[11px] font-semibold border border-blue-200 dark:border-blue-900/60">
            <span>Versión 0.1.0</span>
          </div>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400 text-xs font-normal max-w-xs mx-auto leading-relaxed">
            Herramienta para la planificación y gestión de proyectos
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Metadata Cards */}
          <div className="space-y-2 bg-neutral-50 dark:bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80">
            {/* Author */}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Autor:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                Carlos Durán
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Contacto:</span>
              <button
                onClick={() => handleOpenLink('mailto:carlos.duran@formatocd.es')}
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>carlos.duran@formatocd.es</span>
              </button>
            </div>

            {/* Repository */}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Repositorio:</span>
              <button
                onClick={() => handleOpenLink('https://github.com/formatocd/easy-project')}
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>github.com/formatocd/easy-project</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </button>
            </div>

            {/* License */}
            <div className="flex items-center justify-between py-1">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">Licencia:</span>
              <div className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <Shield className="w-3.5 h-3.5" />
                <span>MIT</span>
              </div>
            </div>
          </div>

          {/* Built With */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-neutral-600 dark:text-neutral-400 font-medium">
              <Code className="w-3.5 h-3.5 text-neutral-400" />
              <span>Tecnologías integradas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-medium border border-neutral-200/60 dark:border-neutral-700/60"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            &copy; {new Date().getFullYear()} Carlos Durán &middot; Formato CD
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
