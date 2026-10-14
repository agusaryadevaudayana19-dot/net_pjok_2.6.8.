import React from 'react';
import { Check, CheckSquare, Square, Users, AlertCircle } from 'lucide-react';
import { Kelas } from '../../types';

export interface KelasTargetSelectorProps {
  availableClasses: Kelas[];
  selectedClassIds: string[];
  onChange: (ids: string[]) => void;
  accentColor?: 'sky' | 'emerald' | 'purple' | 'amber';
  label?: string;
  helperText?: string;
}

export const KelasTargetSelector: React.FC<KelasTargetSelectorProps> = ({
  availableClasses,
  selectedClassIds = [],
  onChange,
  accentColor = 'sky',
  label = 'Target Kelas / Rombel',
  helperText = 'Centang kelas yang akan menerima item ini. Murid dari kelas yang tidak dicentang tidak akan melihat item ini.',
}) => {
  const allIds = availableClasses.map((k) => k.id);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedClassIds.includes(id));
  const isNoneSelected = selectedClassIds.length === 0;

  const handleSelectAll = () => {
    onChange([...allIds]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleToggle = (kelasId: string) => {
    if (selectedClassIds.includes(kelasId)) {
      onChange(selectedClassIds.filter((id) => id !== kelasId));
    } else {
      onChange([...selectedClassIds, kelasId]);
    }
  };

  // Color styles configuration
  const colorMap = {
    sky: {
      btnActive: 'bg-sky-600 text-white hover:bg-sky-700',
      btnSecondary: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
      cardActive: 'bg-sky-50/90 border-sky-400 text-sky-950 ring-2 ring-sky-400/20 shadow-xs',
      checkColor: 'bg-sky-600 border-sky-600 text-white',
      badge: 'bg-sky-100 text-sky-900 border-sky-200',
    },
    emerald: {
      btnActive: 'bg-emerald-600 text-white hover:bg-emerald-700',
      btnSecondary: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
      cardActive: 'bg-emerald-50/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/20 shadow-xs',
      checkColor: 'bg-emerald-600 border-emerald-600 text-white',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    },
    purple: {
      btnActive: 'bg-purple-600 text-white hover:bg-purple-700',
      btnSecondary: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
      cardActive: 'bg-purple-50/90 border-purple-400 text-purple-950 ring-2 ring-purple-400/20 shadow-xs',
      checkColor: 'bg-purple-600 border-purple-600 text-white',
      badge: 'bg-purple-100 text-purple-900 border-purple-200',
    },
    amber: {
      btnActive: 'bg-amber-600 text-white hover:bg-amber-700',
      btnSecondary: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      cardActive: 'bg-amber-50/90 border-amber-400 text-amber-950 ring-2 ring-amber-400/20 shadow-xs',
      checkColor: 'bg-amber-600 border-amber-600 text-white',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
    },
  };

  const theme = colorMap[accentColor] || colorMap.sky;

  // Selected names for summary
  const selectedClassNames = availableClasses
    .filter((k) => selectedClassIds.includes(k.id))
    .map((k) => k.nama);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block font-black text-slate-800 text-xs tracking-tight">
            {label} <span className="text-rose-500">*</span>
          </label>
          {helperText && (
            <p className="text-[11px] text-slate-500 leading-snug">{helperText}</p>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
              isAllSelected ? theme.btnActive : theme.btnSecondary
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Pilih Semua</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1"
          >
            <Square className="w-3.5 h-3.5 text-slate-400" />
            <span>Kosongkan</span>
          </button>
        </div>
      </div>

      {/* Summary chip badge */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {isNoneSelected ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-300 text-rose-700 rounded-lg font-bold text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Belum ada kelas yang dicentang. Wajib pilih minimal 1 kelas!</span>
          </div>
        ) : isAllSelected ? (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-[11px] ${theme.badge}`}>
            <Users className="w-3.5 h-3.5" />
            <span>Semua Rombel Terpilih ({availableClasses.length} Kelas)</span>
          </div>
        ) : (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-bold text-[11px] ${theme.badge}`}>
            <Check className="w-3.5 h-3.5" />
            <span>
              {selectedClassIds.length} Kelas Terpilih:{' '}
              <span className="font-extrabold">{selectedClassNames.join(', ')}</span>
            </span>
          </div>
        )}
      </div>

      {/* Grid of classes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/90 max-h-44 overflow-y-auto">
        {availableClasses.map((k) => {
          const isChecked = selectedClassIds.includes(k.id);
          return (
            <div
              key={k.id}
              onClick={() => handleToggle(k.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2 ${
                isChecked
                  ? theme.cardActive
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? theme.checkColor
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="min-w-0">
                  <span className={`block text-xs font-black truncate ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                    Kelas {k.nama}
                  </span>
                  {k.tingkat && (
                    <span className="block text-[9.5px] text-slate-400 font-medium">
                      Fase {k.tingkat === 'X' ? 'E' : 'F'}
                    </span>
                  )}
                </div>
              </div>

              {k.totalMurid !== undefined && (
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {k.totalMurid} murid
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
