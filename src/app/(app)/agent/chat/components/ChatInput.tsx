"use client";

import { type FormEvent, type RefObject } from "react";
import { ArrowUp, Loader2, Plus } from "lucide-react";
import { ActionsPopup } from "./ActionsPopup";
import type { ChatMode } from "../types/chat";

interface ChatInputProps {
  mode: ChatMode;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
  showActionsPopup: boolean;
  actionsPopupRef: RefObject<HTMLDivElement>;
  inputRef?: RefObject<HTMLInputElement>;
  onActionsToggle: () => void;
  onActionClick: (prompt: string) => void;
}

/** Composer docked to the bottom of the chat screen (in-flow, so it stays inside the app frame). */
export const ChatInput = ({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  showActionsPopup,
  actionsPopupRef,
  inputRef,
  onActionsToggle,
  onActionClick,
}: ChatInputProps) => {
  const canSend = !!input.trim() && !isLoading;

  return (
    <div className="shrink-0 border-t border-border bg-white px-3 pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={onActionsToggle}
            className="w-11 h-11 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Quick actions"
            aria-expanded={showActionsPopup}
          >
            <Plus className={`h-5 w-5 transition-transform ${showActionsPopup ? "rotate-45" : ""}`} />
          </button>
          <ActionsPopup isOpen={showActionsPopup} popupRef={actionsPopupRef} onActionClick={onActionClick} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
          placeholder={isLoading ? "Assistant is working…" : "Ask or tell me what to do…"}
          aria-label="Message the assistant"
          className="flex-1 min-w-0 h-11 px-4 rounded-full bg-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-black/80 disabled:opacity-70"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="w-11 h-11 shrink-0 rounded-full bg-primary border-2 border-black flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 enabled:active:scale-95"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.75} />}
        </button>
      </form>
    </div>
  );
};
