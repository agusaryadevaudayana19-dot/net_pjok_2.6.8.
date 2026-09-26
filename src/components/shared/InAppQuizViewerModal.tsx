import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Code2,
  Globe,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface InAppQuizViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  type?: 'google-form' | 'appscript' | 'aplikasi-lain';
  subtitle?: string;
  onMarkCompleted?: () => void;
  isCompleted?: boolean;
}

/**
 * Helper to ensure embedded URLs load cleanly inside iframes.
 */
export function formatQuizEmbedUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // 1. Google Forms
  if (url.includes('docs.google.com/forms')) {
    if (!url.includes('embedded=true')) {
      url += url.includes('?') ? '&embedded=true' : '?embedded=true';
    }
  }

  // 2. Wordwall
  if (url.includes('wordwall.net/resource/') && !url.includes('/embed/')) {
    url = url.replace('/resource/', '/embed/');
  }

  return url;
}

export const InAppQuizViewerModal: React.FC<InAppQuizViewerModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  type = 'aplikasi-lain',
  subtitle,
  onMarkCompleted,
  isCompleted = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  const embedUrl = formatQuizEmbedUrl(url);

  const getPlatformMeta = () => {
    switch (type) {
      case 'google-form':
        return {
          label: 'Google Form Tersemat',
          color: 'bg-purple-100 text-purple-900 border-purple-200',
          icon: <FileText className="w-4 h-4 text-purple-700" />,
          desc: 'Formulir soal Google Forms interaktif langsung di dalam aplikasi.',
        };
      case 'appscript':
        return {
          label: 'Google Apps Script (AppScript)',
          color: 'bg-blue-100 text-blue-900 border-blue-200',
          icon: <Code2 className="w-4 h-4 text-blue-700" />,
          desc: 'Web App interaktif Google Apps Script dimuat langsung di dalam aplikasi.',
        };
      default:
        return {
          label: 'Aplikasi Soal Interaktif',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
          icon: <Globe className="w-4 h-4 text-emerald-700" />,
          desc: 'Aplikasi kuis atau bank soal eksternal terintegrasi di dalam LMS.',
        };
    }
  };

  const meta = getPlatformMeta();

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full rounded-none sm:rounded-2xl'
            : 'w-full max-w-6xl h-[92vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              {meta.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Terbuka di dalam aplikasi
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-white truncate mt-0.5">
                {title || 'Soal Asesmen PJOK'}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-slate-300 truncate font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onMarkCompleted && (
              <button
                type="button"
                onClick={onMarkCompleted}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                }`}
                title="Tandai butir soal atau kuis ini telah selesai dikerjakan"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>{isCompleted ? '✓ Selesai Dikerjakan' : 'Tandai Selesai'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Muat Ulang Halaman Soal"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Buka di Tab Eksternal (Cadangan jika frame dibatasi)"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer ml-1"
              title="Tutup Pratinjau Soal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Notification Ribbon */}
        <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold text-[11px] leading-tight">
              Kuis terbuka langsung di aplikasi ini. Jika formulir kosong karena proteksi server luar, klik tombol icon panah luar di pojok kanan atas.
            </span>
          </div>
          <span className="text-[10px] text-amber-700 font-mono hidden md:inline truncate max-w-xs">
            {embedUrl}
          </span>
        </div>

        {/* Embedded Iframe Container */}
        <div className="flex-1 w-full h-full relative bg-slate-100 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10 gap-3">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600">
                Memuat Soal di Dalam Aplikasi...
              </p>
            </div>
          )}

          <iframe
            key={iframeKey}
            src={embedUrl}
            title={title || 'Soal Asesmen'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
};
