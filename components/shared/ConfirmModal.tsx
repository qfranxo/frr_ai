'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={`px-6 py-7 flex items-center justify-center relative ${
          type === 'danger' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
          type === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 
          'bg-gradient-to-r from-blue-500 to-purple-500'
        } text-white`}>
          <div className="flex items-center">
            {type === 'danger' || type === 'warning' ? (
              <AlertTriangle className="h-9 w-9" />
            ) : null}
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors absolute right-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* 본문 */}
        <div className="p-6 pt-7">
          <p className="text-gray-700 leading-relaxed text-center font-medium">
            {title && <span className="block text-gray-900 text-lg mb-2">{title}</span>}
            {message.includes("This action cannot be undone") ? (
              <>
                {message.replace("This action cannot be undone.", "")}
                <span className="block mt-3 text-red-500 font-medium">
                  This action cannot be undone.
                </span>
              </>
            ) : (
              message
            )}
          </p>
        </div>
        
        {/* 버튼 영역 */}
        <div className="px-6 py-5 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-lg text-white font-medium ${
              type === 'danger' ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:shadow-lg hover:shadow-red-500/20' : 
              type === 'warning' ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:shadow-lg hover:shadow-amber-500/20' : 
              'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:shadow-blue-500/20'
            } transition-all transform hover:-translate-y-0.5`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}; 