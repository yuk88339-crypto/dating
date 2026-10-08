/**
 * VideoPanel Component
 * Displays WebRTC remote and local peer video feeds with intuitive media controls.
 */

import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, UserCheck, AlertCircle } from 'lucide-react';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  distanceRange?: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  mediaError: string | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export const VideoPanel: React.FC<VideoPanelProps> = ({
  localStream,
  remoteStream,
  distanceRange,
  isAudioMuted,
  isVideoOff,
  mediaError,
  onToggleAudio,
  onToggleVideo
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="relative w-full h-full min-h-[320px] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800/80 flex flex-col justify-center items-center">
      {/* Remote Video Stream (Main) */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
            <UserCheck className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-zinc-300">Connecting video stream...</p>
          {distanceRange && (
            <p className="text-xs text-emerald-400 mt-1 font-mono">
              Stranger is {distanceRange} away
            </p>
          )}
        </div>
      )}

      {/* Local Video Stream (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 w-32 sm:w-44 aspect-video rounded-xl overflow-hidden border border-zinc-700/80 shadow-2xl bg-zinc-900 z-10">
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${
              isVideoOff ? 'opacity-0' : 'opacity-100'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
            No Camera
          </div>
        )}

        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/90 text-zinc-400 text-xs">
            Camera Off
          </div>
        )}

        <div className="absolute bottom-1.5 left-2 text-[10px] font-medium bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur-xs">
          You
        </div>
      </div>

      {/* Media Permission Warning Banner */}
      {mediaError && (
        <div className="absolute top-4 left-4 right-20 sm:right-52 z-20 p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="truncate">{mediaError}</span>
        </div>
      )}

      {/* Media Controls Bar Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 shadow-xl">
        <button
          onClick={onToggleAudio}
          className={`p-2.5 rounded-xl transition-all active:scale-95 ${
            isAudioMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleVideo}
          className={`p-2.5 rounded-xl transition-all active:scale-95 ${
            isVideoOff
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
          title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          aria-label={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
