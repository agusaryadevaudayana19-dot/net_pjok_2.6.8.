import React, { useState } from 'react';
import { X, ExternalLink, Video, FileText, Globe, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

interface InAppMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  category?: string;
}

export function parseMediaUrl(rawUrl: string): {
  embedUrl: string;
  type: 'youtube' | 'drive' | 'pdf' | 'web';
  cleanUrl: string;
} {
  const url = (rawUrl || '').trim();
  if (!url) {
    return { embedUrl: '', type: 'web', cleanUrl: '' };
  }

  // 1. YouTube
  if (url.includes('youtube.com/watch')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    if (videoId) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
        type: 'youtube',
        cleanUrl: url,
      };
    }
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
        type: 'youtube',
        cleanUrl: url,
      };
    }
  }
  if (url.includes('youtube.com/shorts/')) {
    const videoId = url.split('shorts/')[1]?.split('?')[0];
    if (videoId) {
      return {
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
        type: 'youtube',
        cleanUrl: url,
      };
    }
  }
  if (url.includes('youtube.com/embed/')) {
    return {
      embedUrl: url,
      type: 'youtube',
      cleanUrl: url,
    };
  }

  // 2. Google Drive File
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        type: 'drive',
        cleanUrl: url,
      };
    }
  }

  // Google Docs
  if (url.includes('docs.google.com/document/d/')) {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://docs.google.com/document/d/${match[1]}/preview`,
        type: 'drive',
        cleanUrl: url,
      };
    }
  }

  // Google Spreadsheets
  if (url.includes('docs.google.com/spreadsheets/d/')) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://docs.google.com/spreadsheets/d/${match[1]}/preview?widget=true&headers=false`,
        type: 'drive',
        cleanUrl: url,
      };
    }
  }

  // Google Slides / Presentations
  if (url.includes('docs.google.com/presentation/d/')) {
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return {
        embedUrl: `https://docs.google.com/presentation/d/${match[1]}/embed`,
        type: 'drive',
        cleanUrl: url,
      };
    }
  }

  // 3. PDF
  if (url.toLowerCase().endsWith('.pdf')) {
    return {
      embedUrl: url,
      type: 'pdf',
      cleanUrl: url,
    };
  }

  // 4. Default web URL
  return {
    embedUrl: url,
    type: 'web',
    cleanUrl: url,
  };
}

export const InAppMediaModal: React.FC<InAppMediaModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  category,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (!isOpen || !url) return null;

  const { embedUrl, type, cleanUrl } = parseMediaUrl(url);

  const getHeaderIcon = () => {
    switch (type) {
      case 'youtube':
        return <Video className="w-5 h-5 text-rose-500" />;
      case 'drive':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-sky-500" />;
      default:
        return <Globe className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'youtube':
        return 'YouTube Player (In-App)';
      case 'drive':
        return 'Google Drive Viewer (In-App)';
      case 'pdf':
        return 'Dokumen / Modul (In-App)';
      default:
        return 'Tampilan Web (In-App)';
    }
  };

  return (
    <div
      id="in-app-media-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="in-app-media-modal-container"
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullScreen
            ? 'w-full h-full max-w-full rounded-none border-0'
            : 'w-full max-w-4xl h-[85vh] max-h-[850px]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
              {getHeaderIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {category || getTypeLabel()}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium hidden sm:inline">
                  • Tetap di aplikasi
                </span>
              </div>
              <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {title || 'Media Pembelajaran PJOK'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setReloadKey((prev) => prev + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Muat Ulang Tampilan"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:inline-flex"
              title={isFullScreen ? 'Perkecil' : 'Layar Penuh'}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
              title="Tutup Tampilan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 w-full bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center">
          {type === 'youtube' ? (
            <iframe
              key={reloadKey}
              src={embedUrl}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={title || 'Video PJOK'}
            />
          ) : (
            <iframe
              key={reloadKey}
              src={embedUrl}
              className="w-full h-full border-0 bg-white"
              allow="autoplay; fullscreen"
              title={title || 'Dokumen PJOK'}
            />
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="truncate max-w-[280px] sm:max-w-md">
            Sumber:{' '}
            <span className="text-slate-300 font-mono text-[10px]">
              {cleanUrl}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors text-[11px]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
