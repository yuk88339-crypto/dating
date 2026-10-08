/**
 * MessageList Component
 * Renders chronological messages with auto-scroll and partner typing indicators.
 */

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../hooks/useMatchmaking.ts';

interface MessageListProps {
  messages: ChatMessage[];
  partnerTyping: boolean;
  distanceRange?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  partnerTyping,
  distanceRange
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-12">
          <p className="text-sm">Connecting with someone nearby...</p>
        </div>
      )}

      {messages.map((msg) => {
        if (msg.sender === 'system') {
          return (
            <div key={msg.id} className="flex justify-center my-2">
              <span className="text-xs px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium text-center">
                {msg.text}
              </span>
            </div>
          );
        }

        const isMe = msg.sender === 'me';

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
          >
            <div className="flex items-baseline gap-1.5 mb-1 px-1">
              <span className={`text-[11px] font-semibold ${isMe ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {isMe ? 'You' : 'Stranger'}
              </span>
              {!isMe && distanceRange && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  ({distanceRange})
                </span>
              )}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                isMe
                  ? 'bg-emerald-600 text-white rounded-tr-xs'
                  : 'bg-zinc-800/90 text-zinc-100 rounded-tl-xs border border-zinc-700/50'
              }`}
            >
              {msg.text}
            </div>
          </div>
        );
      })}

      {partnerTyping && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 italic px-2 py-1">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
          </div>
          <span>Stranger is typing...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
