/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { useLocation } from '@/client/hooks/useLocation.ts';
import { useMatchmaking, ChatMode } from '@/client/hooks/useMatchmaking.ts';
import { useWebRTC } from '@/client/hooks/useWebRTC.ts';
import { Landing } from '@/client/components/Landing.tsx';
import { Chat } from '@/client/components/Chat.tsx';
import { ShieldX } from 'lucide-react';

export default function App() {
  const {
    coords,
    status: locationStatus,
    errorMessage: locationError,
    requestLocation,
    setTestLocation
  } = useLocation();

  const {
    isConnected,
    bannedInfo,
    socketError,
    status,
    mode,
    distanceRange,
    initiator,
    roomId,
    onlineCount,
    partnerTyping,
    messages,
    nextCooldownRemaining,
    socket,
    startMatching,
    cancelMatching,
    nextMatch,
    stopChat,
    sendMessage,
    sendTyping,
    blockPartner,
    reportPartner
  } = useMatchmaking(coords);

  // WebRTC hook for peer-to-peer video & audio
  const {
    localStream,
    remoteStream,
    mediaError,
    isAudioMuted,
    isVideoOff,
    startMedia,
    stopMedia,
    toggleAudio,
    toggleVideo
  } = useWebRTC({
    socket,
    enabled: mode === 'video' && status === 'matched',
    initiator,
    roomId
  });

  // Start local media tracks when entering video mode
  const handleStartChat = useCallback(
    async (selectedMode: ChatMode) => {
      if (selectedMode === 'video') {
        await startMedia();
      }
      startMatching(selectedMode);
    },
    [startMedia, startMatching]
  );

  // Clean up media streams when stopping chat
  const handleStopChat = useCallback(() => {
    stopMedia();
    stopChat();
  }, [stopMedia, stopChat]);

  // Global keyboard shortcuts (Escape key skips to next stranger)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status === 'matched') {
        nextMatch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, nextMatch]);

  // If user is banned (3+ reports within 24h)
  if (bannedInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-red-900/60 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto mb-4">
            <ShieldX className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Suspended</h2>
          <p className="text-sm text-zinc-400 mb-4">{bannedInfo.reason}</p>
          {bannedInfo.expiresAt && (
            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 mb-6">
              Expires: {new Date(bannedInfo.expiresAt).toLocaleString()}
            </div>
          )}
          <p className="text-xs text-zinc-500">
            NearChat enforces zero-tolerance for nudity, harassment, and abusive behavior.
          </p>
        </div>
      </div>
    );
  }

  // Render Landing page when idle
  if (status === 'idle') {
    return (
      <Landing
        coords={coords}
        locationStatus={locationStatus}
        locationError={locationError}
        onlineCount={onlineCount}
        onRequestLocation={requestLocation}
        onSelectTestLocation={setTestLocation}
        onStart={handleStartChat}
      />
    );
  }

  // Render Chat interface during searching, active chat, or partner_left
  return (
    <Chat
      status={status}
      mode={mode}
      distanceRange={distanceRange}
      onlineCount={onlineCount}
      isConnected={isConnected}
      messages={messages}
      partnerTyping={partnerTyping}
      nextCooldownRemaining={nextCooldownRemaining}
      socketError={socketError}
      localStream={localStream}
      remoteStream={remoteStream}
      mediaError={mediaError}
      isAudioMuted={isAudioMuted}
      isVideoOff={isVideoOff}
      onToggleAudio={toggleAudio}
      onToggleVideo={toggleVideo}
      onSendMessage={sendMessage}
      onSendTyping={sendTyping}
      onNext={nextMatch}
      onStop={handleStopChat}
      onBlock={blockPartner}
      onReport={reportPartner}
      onCancelSearching={cancelMatching}
    />
  );
}
