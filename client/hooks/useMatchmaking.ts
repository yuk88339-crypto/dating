/**
 * useMatchmaking Hook
 * Coordinates queue state, chat messages, partner status, and matchmaking actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket, BanInfo } from './useSocket.ts';
import { Coordinates } from './useLocation.ts';

export type MatchStatus = 'idle' | 'searching' | 'matched' | 'partner_left';
export type ChatMode = 'text' | 'video';

export interface ChatMessage {
  id: string;
  sender: 'me' | 'partner' | 'system';
  text: string;
  timestamp: number;
}

export function useMatchmaking(coords: Coordinates | null) {
  const { isConnected, isReconnecting, bannedInfo, socketError, setSocketError, emit, on, off, socket } =
    useSocket();

  const [status, setStatus] = useState<MatchStatus>('idle');
  const [mode, setMode] = useState<ChatMode>('text');
  const [distanceRange, setDistanceRange] = useState<string>('');
  const [initiator, setInitiator] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [partnerId, setPartnerId] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCooldownRemaining, setNextCooldownRemaining] = useState<number>(0);

  const typingTimeoutRef = useRef<any>(null);
  const nextCooldownTimerRef = useRef<any>(null);

  // Socket event subscriptions
  useEffect(() => {
    if (!socket) return;

    const handleSearching = (data: { message: string; onlineCountNear?: number; mode?: ChatMode }) => {
      setStatus('searching');
      setDistanceRange('');
      setPartnerId('');
      setRoomId('');
      if (data?.onlineCountNear !== undefined) {
        setOnlineCount(data.onlineCountNear);
      }
      if (data?.mode) {
        setMode(data.mode);
      }
    };

    const handleMatched = (data: {
      roomId: string;
      distanceRange: string;
      initiator: boolean;
      mode: ChatMode;
      partnerId: string;
    }) => {
      setStatus('matched');
      setRoomId(data.roomId);
      setDistanceRange(data.distanceRange);
      setInitiator(data.initiator);
      setMode(data.mode);
      setPartnerId(data.partnerId);
      setPartnerTyping(false);

      // System greeting message
      const greetingMsg: ChatMessage = {
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: `Connected with a stranger ${data.distanceRange} away. Say hi!`,
        timestamp: Date.now()
      };
      setMessages([greetingMsg]);
    };

    const handlePartnerMessage = (data: { text: string; id: string; timestamp: number }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.id || `msg_${Date.now()}`,
          sender: 'partner',
          text: data.text,
          timestamp: data.timestamp || Date.now()
        }
      ]);
      setPartnerTyping(false);
    };

    const handlePartnerTyping = (data: { isTyping: boolean }) => {
      setPartnerTyping(Boolean(data?.isTyping));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (data?.isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 4000);
      }
    };

    const handlePartnerLeft = (data: { message?: string }) => {
      setStatus('partner_left');
      setPartnerTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys_left_${Date.now()}`,
          sender: 'system',
          text: data?.message || 'Stranger has disconnected.',
          timestamp: Date.now()
        }
      ]);
    };

    const handleOnlineCount = (data: { count: number; radiusKm: number }) => {
      if (typeof data?.count === 'number') {
        setOnlineCount(data.count);
      }
    };

    socket.on('searching', handleSearching);
    socket.on('matched', handleMatched);
    socket.on('partner_message', handlePartnerMessage);
    socket.on('partner_typing', handlePartnerTyping);
    socket.on('partner_left', handlePartnerLeft);
    socket.on('online_count', handleOnlineCount);

    return () => {
      socket.off('searching', handleSearching);
      socket.off('matched', handleMatched);
      socket.off('partner_message', handlePartnerMessage);
      socket.off('partner_typing', handlePartnerTyping);
      socket.off('partner_left', handlePartnerLeft);
      socket.off('online_count', handleOnlineCount);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (nextCooldownTimerRef.current) clearInterval(nextCooldownTimerRef.current);
    };
  }, [socket]);

  /**
   * Starts looking for a nearby match
   */
  const startMatching = useCallback(
    (selectedMode: ChatMode) => {
      if (!coords) {
        setSocketError('Location is required before starting matchmaking.');
        return;
      }

      setMode(selectedMode);
      setStatus('searching');
      setMessages([]);
      setPartnerTyping(false);

      emit('join_queue', {
        lat: coords.lat,
        lng: coords.lng,
        mode: selectedMode
      });
    },
    [coords, emit, setSocketError]
  );

  /**
   * Leaves the waiting queue and returns to idle
   */
  const cancelMatching = useCallback(() => {
    emit('leave_queue');
    setStatus('idle');
    setMessages([]);
  }, [emit]);

  /**
   * Skips to the next nearby stranger
   */
  const nextMatch = useCallback(() => {
    if (nextCooldownRemaining > 0) return;

    // Start 2 second cooldown
    setNextCooldownRemaining(2);
    if (nextCooldownTimerRef.current) clearInterval(nextCooldownTimerRef.current);
    nextCooldownTimerRef.current = setInterval(() => {
      setNextCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(nextCooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setStatus('searching');
    setPartnerTyping(false);
    emit('next');
  }, [nextCooldownRemaining, emit]);

  /**
   * Stops chatting completely and returns to landing
   */
  const stopChat = useCallback(() => {
    emit('leave_queue');
    setStatus('idle');
    setMessages([]);
    setRoomId('');
    setPartnerId('');
  }, [emit]);

  /**
   * Sends a text message to partner
   */
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || status !== 'matched') return;

      const userMsg: ChatMessage = {
        id: `me_${Date.now()}`,
        sender: 'me',
        text: text.trim(),
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, userMsg]);

      emit('send_message', { text: text.trim() });
      emit('typing', { isTyping: false });
    },
    [status, emit]
  );

  /**
   * Emits typing indicator to partner
   */
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (status === 'matched') {
        emit('typing', { isTyping });
      }
    },
    [status, emit]
  );

  /**
   * Blocks the current partner permanently for this session
   */
  const blockPartner = useCallback(() => {
    emit('block');
    setStatus('idle');
    setMessages([]);
    setRoomId('');
    setPartnerId('');
  }, [emit]);

  /**
   * Reports the current partner
   */
  const reportPartner = useCallback(
    (reason: 'nudity' | 'harassment' | 'spam' | 'other') => {
      emit('report', { reason });
      setStatus('idle');
      setMessages([]);
      setRoomId('');
      setPartnerId('');
    },
    [emit]
  );

  return {
    isConnected,
    isReconnecting,
    bannedInfo,
    socketError,
    status,
    mode,
    distanceRange,
    initiator,
    roomId,
    partnerId,
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
  };
}
