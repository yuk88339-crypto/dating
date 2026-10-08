/**
 * Chat Page Component
 * Main active session viewport orchestrating TopBar, VideoPanel, MessageList, MessageInput, and ReportModal.
 */

import React, { useState } from 'react';
import { TopBar } from './TopBar.tsx';
import { VideoPanel } from './VideoPanel.tsx';
import { MessageList } from './MessageList.tsx';
import { MessageInput } from './MessageInput.tsx';
import { ReportModal } from './ReportModal.tsx';
import { SearchingScreen } from './SearchingScreen.tsx';
import { MatchStatus, ChatMode, ChatMessage } from '../hooks/useMatchmaking.ts';
import { FastForward, UserMinus } from 'lucide-react';

interface ChatProps {
  status: MatchStatus;
  mode: ChatMode;
  distanceRange?: string;
  onlineCount: number;
  isConnected: boolean;
  messages: ChatMessage[];
  partnerTyping: boolean;
  nextCooldownRemaining: number;
  socketError: string | null;

  // WebRTC
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  mediaError: string | null;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;

  // Actions
  onSendMessage: (text: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onNext: () => void;
  onStop: () => void;
  onBlock: () => void;
  onReport: (reason: 'nudity' | 'harassment' | 'spam' | 'other') => void;
  onCancelSearching: () => void;
}

export const Chat: React.FC<ChatProps> = ({
  status,
  mode,
  distanceRange,
  onlineCount,
  isConnected,
  messages,
  partnerTyping,
  nextCooldownRemaining,
  socketError,

  localStream,
  remoteStream,
  mediaError,
  isAudioMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,

  onSendMessage,
  onSendTyping,
  onNext,
  onStop,
  onBlock,
  onReport,
  onCancelSearching
}) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <TopBar
        status={status}
        mode={mode}
        distanceRange={distanceRange}
        onlineCount={onlineCount}
        isConnected={isConnected}
        onOpenReport={() => setIsReportModalOpen(true)}
        onBlock={onBlock}
        onStop={onStop}
      />

      {/* Socket Error Notice */}
      {socketError && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-center text-xs text-amber-200 animate-fadeIn z-20">
          {socketError}
        </div>
      )}

      {/* Main Viewport Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {status === 'searching' ? (
          <SearchingScreen
            mode={mode}
            onlineCount={onlineCount}
            onCancel={onCancelSearching}
          />
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full h-full p-2 sm:p-4 gap-2 sm:gap-4">
            {/* Left/Center Pane: Video or Pure Chat */}
            {mode === 'video' ? (
              <div className="flex-1 lg:w-3/5 h-1/2 lg:h-full flex flex-col">
                <VideoPanel
                  localStream={localStream}
                  remoteStream={remoteStream}
                  distanceRange={distanceRange}
                  isAudioMuted={isAudioMuted}
                  isVideoOff={isVideoOff}
                  mediaError={mediaError}
                  onToggleAudio={onToggleAudio}
                  onToggleVideo={onToggleVideo}
                />
              </div>
            ) : null}

            {/* Right Pane: Messages list (or full width in Text mode) */}
            <div
              className={`flex flex-col bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden ${
                mode === 'video'
                  ? 'flex-1 lg:w-2/5 h-1/2 lg:h-full'
                  : 'w-full max-w-4xl mx-auto h-full'
              }`}
            >
              {/* Partner left overlay card */}
              {status === 'partner_left' && (
                <div className="p-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <UserMinus className="w-4 h-4 text-zinc-500" />
                    <span>Stranger has left the conversation.</span>
                  </div>
                  <button
                    onClick={onNext}
                    className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Find New Stranger</span>
                  </button>
                </div>
              )}

              {/* Messages list */}
              <MessageList
                messages={messages}
                partnerTyping={partnerTyping}
                distanceRange={distanceRange}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Message and Navigation Controls */}
      <MessageInput
        status={status}
        nextCooldownRemaining={nextCooldownRemaining}
        onSendMessage={onSendMessage}
        onSendTyping={onSendTyping}
        onNext={onNext}
        onStop={onStop}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={onReport}
      />
    </div>
  );
};
