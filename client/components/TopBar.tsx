/**
 * TopBar Component
 * Displays brand identity, live nearby count, partner distance badge, and moderation actions.
 */

import React from 'react';
import { ShieldAlert, UserX, Radio, Users, MapPin } from 'lucide-react';
import { ChatMode, MatchStatus } from '../hooks/useMatchmaking.ts';

interface TopBarProps {
  status: MatchStatus;
  mode: ChatMode;
  distanceRange?: string;
  onlineCount: number;
  isConnected: boolean;
  onOpenReport?: () => void;
  onBlock?: () => void;
  onStop?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  mode,
  distanceRange,
  onlineCount,
  isConnected,
  onOpenReport,
  onBlock,
  onStop
}) => {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Zone 1: Brand Wordmark & Mode */}
      <div className="flex items-center gap-3">
        <button
          onClick={onStop}
          className="flex items-center gap-2 text-left group focus:outline-none"
          title="Return to home"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              NearChat
            </span>
          </div>
        </button>

        {status === 'matched' && (
          <span className="hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-300">
            {mode === 'video' ? 'Video Mode' : 'Text Mode'}
          </span>
        )}
      </div>

      {/* Zone 2: Proximity & Online Presence */}
      <div className="flex items-center gap-3 sm:gap-6 text-xs text-zinc-400">
        {status === 'matched' && distanceRange && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-medium animate-fadeIn">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Stranger {distanceRange}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 font-mono tabular-nums text-zinc-400">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            {onlineCount} {onlineCount === 1 ? 'person' : 'people'} near you
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'
            }`}
          />
          <span className="text-zinc-500">{isConnected ? '30 km Radar' : 'Reconnecting...'}</span>
        </div>
      </div>

      {/* Zone 3: Moderation Controls */}
      <div className="flex items-center gap-2">
        {status === 'matched' && (
          <>
            <button
              onClick={onBlock}
              className="h-8 px-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="Block this stranger for this session"
            >
              <UserX className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Block</span>
            </button>

            <button
              onClick={onOpenReport}
              className="h-8 px-2.5 rounded-lg border border-red-950 hover:border-red-800 bg-red-950/30 hover:bg-red-900/40 text-red-400 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="Report inappropriate behavior"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Report</span>
            </button>
          </>
        )}

        {status !== 'idle' && (
          <button
            onClick={onStop}
            className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all active:scale-95"
          >
            Leave
          </button>
        )}
      </div>
    </header>
  );
};
