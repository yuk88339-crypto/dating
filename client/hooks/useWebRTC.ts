/**
 * useWebRTC Hook
 * Peer-to-peer WebRTC video and audio streaming with Socket.io signaling.
 * Handles local media capture, track muting, peer connection lifecycle, and graceful cleanup.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export function useWebRTC({
  socket,
  enabled,
  initiator,
  roomId
}: {
  socket: Socket | null;
  enabled: boolean;
  initiator: boolean;
  roomId: string;
}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [iceServers, setIceServers] = useState<RTCIceServer[]>(DEFAULT_ICE_SERVERS);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Fetch configured STUN/TURN servers from server
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
          setIceServers(data.iceServers);
        }
      })
      .catch(() => {
        // Fallback to default Google STUN servers
        setIceServers(DEFAULT_ICE_SERVERS);
      });
  }, []);

  /**
   * Acquire camera & microphone streams
   */
  const startMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setMediaError(null);
      // Clean up previous streams if any
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('Error accessing user media:', err);
      let message = 'Could not access camera or microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera and microphone permissions were denied. Please allow camera/mic access to use video chat.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera or microphone found on this device.';
      }
      setMediaError(message);
      return null;
    }
  }, []);

  /**
   * Stops all active media tracks and clears references
   */
  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  /**
   * Teardown peer connection safely
   */
  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteStream(null);
    pendingIceCandidatesRef.current = [];
  }, []);

  /**
   * WebRTC Signaling & Connection setup
   */
  useEffect(() => {
    if (!enabled || !socket || !roomId) {
      closePeerConnection();
      return;
    }

    const activeSocket = socket;
    let isSubscribed = true;

    async function initWebRTC() {
      // 1. Get or confirm local media stream
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await startMedia();
      }
      if (!stream || !isSubscribed) return;

      // 2. Initialize RTCPeerConnection
      closePeerConnection();

      const pc = new RTCPeerConnection({
        iceServers,
        iceCandidatePoolSize: 10
      });
      pcRef.current = pc;

      // Add local media tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream!);
      });

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          const inboundStream = new MediaStream();
          inboundStream.addTrack(event.track);
          setRemoteStream(inboundStream);
        }
      };

      // Send local ICE candidates to partner through Socket.io
      pc.onicecandidate = (event) => {
        if (event.candidate && activeSocket.connected) {
          activeSocket.emit('webrtc_ice', { candidate: event.candidate.toJSON() });
        }
      };

      // 3. Initiator creates and emits offer
      if (initiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          activeSocket.emit('webrtc_offer', { offer });
        } catch (err) {
          console.error('Error creating WebRTC offer:', err);
        }
      }
    }

    // Signaling event listeners
    const handleOffer = async (data: { offer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Flush any pending ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        activeSocket.emit('webrtc_answer', { answer });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

        // Flush any pending ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const cand = pendingIceCandidatesRef.current.shift();
          if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingIceCandidatesRef.current.push(data.candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    activeSocket.on('webrtc_offer', handleOffer);
    activeSocket.on('webrtc_answer', handleAnswer);
    activeSocket.on('webrtc_ice', handleIceCandidate);

    initWebRTC();

    return () => {
      isSubscribed = false;
      activeSocket.off('webrtc_offer', handleOffer);
      activeSocket.off('webrtc_answer', handleAnswer);
      activeSocket.off('webrtc_ice', handleIceCandidate);
      closePeerConnection();
    };
  }, [enabled, socket, initiator, roomId, iceServers, startMedia, closePeerConnection]);

  // Audio mute toggle
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      });
    }
  }, []);

  // Video toggle
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  }, []);

  return {
    localStream,
    remoteStream,
    mediaError,
    isAudioMuted,
    isVideoOff,
    startMedia,
    stopMedia,
    closePeerConnection,
    toggleAudio,
    toggleVideo
  };
}
