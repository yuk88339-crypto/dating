/**
 * ReportModal Component
 * Community safety reporting with transparent threshold explanations.
 */

import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: 'nudity' | 'harassment' | 'spam' | 'other') => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [selectedReason, setSelectedReason] = useState<'nudity' | 'harassment' | 'spam' | 'other'>(
    'nudity'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Report Stranger</h3>
            <p className="text-xs text-zinc-400">Help keep NearChat safe for everyone</p>
          </div>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-400 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Users receiving <span className="text-zinc-200 font-semibold">3 reports</span> within 24
            hours are automatically banned from the platform for 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Reason for report
          </label>

          <div className="space-y-2">
            {[
              { id: 'nudity', label: 'Nudity or Inappropriate Content' },
              { id: 'harassment', label: 'Harassment, Hate Speech, or Abuse' },
              { id: 'spam', label: 'Spam, Bots, or Advertising' },
              { id: 'other', label: 'Other Guidelines Violation' }
            ].map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedReason === option.id
                    ? 'border-emerald-500/60 bg-emerald-950/20 text-white'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 text-zinc-300'
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={option.id}
                  checked={selectedReason === option.id}
                  onChange={() => setSelectedReason(option.id as any)}
                  className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-700 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:scale-95 rounded-xl shadow-lg shadow-red-900/20 transition-all"
            >
              Submit & Disconnect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
