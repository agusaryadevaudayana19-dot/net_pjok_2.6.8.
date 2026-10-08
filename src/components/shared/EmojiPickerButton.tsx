import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile, X } from 'lucide-react';

export interface EmojiPickerButtonProps {
  onSelectEmoji: (emoji: string) => void;
  label?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  className?: string;
}

const EMOJI_CATEGORIES: {
  id: string;
  label: string;
  icon: string;
  emojis: string[];
}[] = [
  {
    id: 'ekspresi',
    label: 'Ekspresi',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '😉', '😌', '😍', '🥰', '😘', '😎', '🤩', '🥳', '🤗',
      '🤔', '🫡', '😮', '😲', '🥺', '😢', '😭', '😤', '💪', '🙏',
    ],
  },
  {
    id: 'olahraga',
    label: 'PJOK & Olahraga',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏐', '🏸', '🎾', '🏓', '🏊', '🏃', '🤸', '🏋️',
      '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎯', '🥊', '🥋',
      '⛳', '🏹', '🤾', '🧘', '⏱️', '📢', '🏁', '🔥', '⚡', '💯',
    ],
  },
  {
    id: 'sekolah',
    label: 'Belajar & Apresiasi',
    icon: '📚',
    emojis: [
      '👍', '👏', '🙌', '🤝', '✌️', '👌', '🫶', '❤️', '💙', '💚',
      '⭐', '🌟', '✨', '🎉', '🎊', '📚', '📖', '📝', '✏️', '📌',
      '💡', '✅', '❗', '❓', '💬', '📅', '⏰', '🎓', '🏫', '🚀',
    ],
  },
  {
    id: 'kesehatan',
    label: 'Kebugaran & Gizi',
    icon: '🍎',
    emojis: [
      '🍎', '🍌', '🍉', '🍊', '🥦', '🥕', '🥗', '🥛', '💧', '🚰',
      '❤️‍🩹', '🩺', '🩹', '🧼', '🦷', '☀️', '🌈', '🌿', '🍀', '🌻',
    ],
  },
];

export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  onSelectEmoji,
  label = 'Emoticon',
  align = 'left',
  size = 'sm',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('ekspresi');
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const updatePopupPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popupWidth = 310;
    const popupHeight = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Hitung posisi vertikal: buka ke atas jika ruang di bawah sempit, atau buka ke bawah jika cukup
    const spaceBelow = vh - rect.bottom;
    let top = rect.bottom + 6;
    if (spaceBelow < popupHeight && rect.top > popupHeight) {
      top = Math.max(8, rect.top - popupHeight - 6);
    } else if (top + popupHeight > vh - 8) {
      top = Math.max(8, vh - popupHeight - 12);
    }

    // Hitung posisi horizontal agar tidak keluar layar HP maupun Laptop
    let left = align === 'right' ? rect.right - popupWidth : rect.left;
    if (left + popupWidth > vw - 8) {
      left = vw - popupWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePopupPosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePopupPosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, align]);

  const currentCategory =
    EMOJI_CATEGORIES.find((c) => c.id === activeTab) || EMOJI_CATEGORIES[0];

  const popupContent =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popupRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
            }}
            className="w-76 sm:w-80 bg-white rounded-2xl border-2 border-amber-300 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="text-sm">😊</span>
                <span>Pilih Emoticon Pembelajaran</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-2.5">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer truncate ${
                    activeTab === cat.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={cat.label}
                >
                  <span className="text-xs">{cat.icon}</span>
                  <span className="truncate">{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Quick Popular Bar */}
            <div className="flex items-center justify-between gap-1 pb-2 mb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Cepat:</span>
              <div className="flex items-center gap-1 overflow-x-auto">
                {['👍', '👏', '🙏', '🔥', '💪', '⚽', '🏆', '❤️', '✅', '🎉'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      onSelectEmoji(em);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-amber-50 text-sm transition-transform hover:scale-110 cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-6 gap-1 max-h-44 overflow-y-auto pr-0.5">
              {currentCategory.emojis.map((emoji, idx) => (
                <button
                  key={`${emoji}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectEmoji(emoji);
                  }}
                  className="h-8 flex items-center justify-center rounded-xl hover:bg-amber-50 active:bg-amber-100 text-base transition-transform hover:scale-110 cursor-pointer"
                  title={`Sisipkan ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>
                Kategori: <strong className="text-slate-600">{currentCategory.label}</strong>
              </span>
              <span>Klik emoticon untuk menyisipkan</span>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Tambahkan Emoticon / Emoji"
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold border transition-all cursor-pointer select-none ${
          isOpen
            ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
            : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
        } ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}`}
      >
        <Smile className={size === 'sm' ? 'w-3.5 h-3.5 text-amber-600' : 'w-4 h-4 text-amber-600'} />
        <span>😊 {label}</span>
      </button>
      {popupContent}
    </div>
  );
};
