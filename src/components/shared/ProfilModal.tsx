import React from 'react';
import { User } from '../../types';
import { LMSDatabase } from '../../services/dataStorage';
import { ProfilMandiri } from './ProfilMandiri';

interface ProfilModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  db: LMSDatabase;
  onUpdateUser: (updatedUser: User) => void;
}

export const ProfilModal: React.FC<ProfilModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  db,
  onUpdateUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-slate-50 w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ProfilMandiri
          currentUser={currentUser}
          db={db}
          onUpdateUser={onUpdateUser}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};
