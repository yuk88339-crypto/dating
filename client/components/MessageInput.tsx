/**
 * MessageInput Component
 * Text input with rate-limit cooldown display, Next match control, and character count limit.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, FastForward, Square } from 'lucide-react';
import { MatchStatus } from '../hooks/useMatchmaking.ts';

interface MessageInputProps {
  status: MatchStatus;
  nextCooldownRemaining: number;
  onSendMessage: (text: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onNext: () => void;
  onStop: () => void;
}

const MAX_CHAR_LIMIT = 500;

export const MessageInput: React.FC<MessageInputProps> = ({
  status,
  nextCooldownRemaining,
  onSendMessage,
  onSendTyping,
  onNext,
  onStop
}) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'matched') {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, MAX_CHAR_LIMIT);
    setText(val);

    // Notify partner of typing
    onSendTyping(val.length > 0);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (text.trim() && status === 'matched') {
      onSendMessage(text);
      setText('');
      onSendTyping(false);
    }
  };

  const isMatched = status === 'matched';
  const isCooldown = nextCooldownRemaining > 0;

  return (
    <div className="p-3 bg-zinc-950 border-t border-zinc-800/80 z-20 shrink-0">
      <div className="max-w-4xl mx-auto flex items-center gap-2">
        {/* Next Stranger Button */}
        <button
          onClick={onNext}
          disabled={isCooldown}
          className={`h-11 px-3.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 ${
            isCooldown
              ? 'bg-zinc-800/50 text-zinc-500 cursor-not-allowed border border-zinc-800'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20'
          }`}
          title={isCooldown ? `Wait ${nextCooldownRemaining}s` : 'Skip to next stranger (Esc)'}
        >
          <FastForward className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isCooldown ? `Next (${nextCooldownRemaining}s)` : 'Next'}
          </span>
        </button>

        {/* Text Message Input */}
        <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={!isMatched}
            placeholder={
              isMatched
                ? 'Type your message... (Enter to send)'
                : status === 'searching'
                ? 'Searching for a match...'
                : 'Stranger left. Click Next.'
            }
            maxLength={MAX_CHAR_LIMIT}
            className="w-full h-11 pl-4 pr-16 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all"
          />

          {/* Char counter */}
          {text.length > 400 && (
            <span className="absolute right-12 text-[10px] text-zinc-500 font-mono">
              {MAX_CHAR_LIMIT - text.length}
            </span>
          )}

          {/* Send Action */}
          <button
            type="submit"
            disabled={!text.trim() || !isMatched}
            className="absolute right-1.5 h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-all active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Stop Button */}
        <button
          onClick={onStop}
          className="h-11 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
          title="Stop chatting"
        >
          <Square className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Stop</span>
        </button>
      </div>
    </div>
  );
};
