/**
 * useSocket Hook
 * Manages Socket.io lifecycle, auto-reconnection, and safety ban alerts.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface BanInfo {
  reason: string;
  expiresAt?: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [bannedInfo, setBannedInfo] = useState<BanInfo | null>(null);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    // Resolve socket connection URL (default: current host origin)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setSocketError(null);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Disconnected explicitly by server
      } else {
        setIsReconnecting(true);
      }
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setIsReconnecting(true);
      setSocketError('Unable to connect to matchmaking server. Retrying...');
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setSocketError(null);
    });

    socket.on('banned', (data: BanInfo) => {
      setBannedInfo(data);
      setIsConnected(false);
    });

    socket.on('error_msg', (data: { message: string }) => {
      if (data?.message) {
        setSocketError(data.message);
        // Clear message after 4 seconds
        setTimeout(() => setSocketError(null), 4000);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, ...args);
    } else {
      console.warn(`Cannot emit "${event}": Socket not connected.`);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    bannedInfo,
    socketError,
    setSocketError,
    emit,
    on,
    off
  };
}
