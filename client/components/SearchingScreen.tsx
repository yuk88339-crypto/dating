/**
 * SearchingScreen Component
 * Sonar radar scanning visualization with live proximity user counter.
 */

import React from 'react';
import { Radar, Users, X, Video, MessageSquare } from 'lucide-react';
import { ChatMode } from '../hooks/useMatchmaking.ts';

interface SearchingScreenProps {
  mode: ChatMode;
  onlineCount: number;
  onCancel: () => void;
}

export const SearchingScreen: React.FC<SearchingScreenProps> = ({
  mode,
  onlineCount,
  onCancel
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      {/* Radar Pulse Visual */}
      <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center mb-8">
        {/* Concentric radar rings */}
        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping [animation-duration:3s]" />
        <div className="absolute inset-4 rounded-full border border-emerald-500/30 animate-pulse [animation-duration:2s]" />
        <div className="absolute inset-10 rounded-full border border-emerald-500/40" />

        {/* Sonar sweep beam */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent animate-spin [animation-duration:4s]" />

        {/* Center Radar Icon */}
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50 z-10">
          <Radar className="w-8 h-8 animate-pulse" />
        </div>
      </div>

      {/* Status Copy */}
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
        Searching for people within 30 km...
      </h2>

      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
          {mode === 'video' ? (
            <>
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>Video Chat</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Text Chat</span>
            </>
          )}
        </span>

        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 tabular-nums">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <span>{onlineCount} active nearby</span>
        </span>
      </div>

      <p className="max-w-md text-xs text-zinc-500 mb-8 leading-relaxed">
        Strict 30 km boundary enforced. You will never be matched with anyone outside your local
        radius.
      </p>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="h-10 px-5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-2 transition-all active:scale-95 shadow-sm"
      >
        <X className="w-4 h-4" />
        <span>Cancel Matching</span>
      </button>
    </div>
  );
};
