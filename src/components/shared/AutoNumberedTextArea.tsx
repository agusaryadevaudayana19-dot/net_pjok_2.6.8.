import React from 'react';
import { handleAutoNumberKeyDown, insertAutoNumberToken } from '../../utils/materiAutoNumber';

interface AutoNumberedTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  theme?: 'emerald' | 'slate' | 'indigo' | 'amber';
  showHeadingButton?: boolean;
}

export const AutoNumberedTextArea: React.FC<AutoNumberedTextAreaProps> = ({
  value,
  onChange,
  rows = 4,
  placeholder,
  className = '',
  theme = 'indigo',
  showHeadingButton = true,
}) => {
  const themeColors = {
    emerald: {
      btnBg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800',
      activeBorder: 'focus:ring-emerald-500/20 border-emerald-200',
    },
    slate: {
      btnBg: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700',
      activeBorder: 'focus:ring-slate-500/20 border-slate-200',
    },
    indigo: {
      btnBg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800',
      activeBorder: 'focus:ring-indigo-500/20 border-indigo-200',
    },
    amber: {
      btnBg: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800',
      activeBorder: 'focus:ring-amber-500/20 border-amber-200',
    },
  }[theme];

  return (
    <div className="w-full max-w-full min-w-0 space-y-1.5">
      {/* Quick MS Word-style Formatting Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-1.5 text-[11px]">
        <span className="text-[10px] text-slate-400 font-medium">
          ⌨️ Tekan <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded-md font-mono text-[9px] text-slate-700">Enter</kbd> untuk otomatis lanjut nomor (seperti MS Word)
        </span>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => onChange(insertAutoNumberToken(value, 'number'))}
            className={`px-2 py-0.5 border rounded-md font-bold transition text-[10px] shadow-2xs ${themeColors.btnBg}`}
            title="Tambah nomor otomatis (1., 2., ...)"
          >
            + 1. Nomor
          </button>
          <button
            type="button"
            onClick={() => onChange(insertAutoNumberToken(value, 'alpha'))}
            className={`px-2 py-0.5 border rounded-md font-bold transition text-[10px] shadow-2xs ${themeColors.btnBg}`}
            title="Tambah huruf otomatis (a., b., ...)"
          >
            + a. Huruf
          </button>
          <button
            type="button"
            onClick={() => onChange(insertAutoNumberToken(value, 'bullet'))}
            className={`px-2 py-0.5 border rounded-md font-bold transition text-[10px] shadow-2xs ${themeColors.btnBg}`}
            title="Tambah poin bullet (-)"
          >
            + - Poin
          </button>
          {showHeadingButton && (
            <button
              type="button"
              onClick={() => onChange(insertAutoNumberToken(value, 'heading'))}
              className={`px-2 py-0.5 border rounded-md font-bold transition text-[10px] shadow-2xs ${themeColors.btnBg}`}
              title="Tambah sub judul bab"
            >
              + Sub Judul (###)
            </button>
          )}
        </div>
      </div>

      {/* Textarea with auto-numbering on Enter */}
      <textarea
        rows={rows}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleAutoNumberKeyDown(e, value || '', onChange)}
        className={`w-full max-w-full min-w-0 px-3 py-2 bg-white rounded-xl focus:outline-hidden focus:ring-2 text-xs leading-relaxed text-justify break-words ${themeColors.activeBorder} ${className}`}
        style={{
          textAlignLast: 'left',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      />
    </div>
  );
};
