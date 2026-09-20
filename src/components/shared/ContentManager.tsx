import React, { useState } from 'react';
import { BookMarked, ClipboardList, CheckCircle } from 'lucide-react';
import { UserRole, User } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import { MateriManager } from './MateriManager';
import { TugasManager } from './TugasManager';
import { QuizManager } from './QuizManager';

interface ContentManagerProps {
  db: LMSDatabase;
  role?: UserRole;
  currentUser?: User;
  type?: 'materi' | 'tugas' | 'quiz';
  initialTab?: 'materi' | 'tugas' | 'quiz';
}

export const ContentManager: React.FC<ContentManagerProps> = ({
  db,
  currentUser,
  type,
  initialTab = 'materi',
}) => {
  // If a specific type is requested, render ONLY that separated manager
  const activeType = type || initialTab;
  const [currentTab, setCurrentTab] = useState<'materi' | 'tugas' | 'quiz'>(activeType);

  const resolvedUser: User = currentUser || {
    id: 'usr-default',
    name: 'Guru PJOK',
    email: 'guru@pjok.sch.id',
    role: 'GURU',
    status: 'AKTIF',
  };

  if (type === 'materi') {
    return <MateriManager db={db} currentUser={resolvedUser} />;
  }

  if (type === 'tugas') {
    return <TugasManager db={db} currentUser={resolvedUser} />;
  }

  if (type === 'quiz') {
    return <QuizManager db={db} currentUser={resolvedUser} />;
  }

  // Fallback if no specific type is enforced
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60">
        <button
          onClick={() => setCurrentTab('materi')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            currentTab === 'materi'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookMarked className="w-4 h-4" />
          Materi PJOK
        </button>
        <button
          onClick={() => setCurrentTab('tugas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            currentTab === 'tugas'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Tugas PJOK
        </button>
        <button
          onClick={() => setCurrentTab('quiz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            currentTab === 'quiz'
              ? 'bg-purple-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Quiz & Asesmen
        </button>
      </div>

      {currentTab === 'materi' && <MateriManager db={db} currentUser={resolvedUser} />}
      {currentTab === 'tugas' && <TugasManager db={db} currentUser={resolvedUser} />}
      {currentTab === 'quiz' && <QuizManager db={db} currentUser={resolvedUser} />}
    </div>
  );
};
