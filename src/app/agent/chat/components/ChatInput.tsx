"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { Send, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActionsPopup } from "./ActionsPopup";
import { useTypingAnimation } from "../hooks/use-typing-animation";
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

export const ChatInput = ({
  mode,
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
  const isMobile = useIsMobile();
  const [isFocused, setIsFocused] = useState(false);

  const placeholder =
    mode === "automation"
      ? isMobile
        ? "Ask about portfolio..."
        : "Ask about portfolio optimization and strategies..."
      : isMobile
      ? "Ask about markets..."
      : "Ask about market trends, assets, or news...";

  const proTipText = 'Pro Tip: use "$" to auto-complete token';
  const { displayedText: animatedText } = useTypingAnimation(
    proTipText,
    80,
    !input.trim() && !isLoading && !isFocused
  );

  return (
    <div
      className={cn(
        "fixed p-3 sm:p-4 bg-secondary border-t border-border shadow-lg z-50 min-h-[72px] sm:min-h-[88px] flex items-center",
        isMobile ? "left-0 right-0 bottom-16" : "left-72 right-0 bottom-0"
      )}
      style={{
        paddingBottom: isMobile
          ? "0.75rem"
          : `calc(0.75rem + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="w-full max-w-5xl sm:max-w-6xl mx-auto px-4 relative">
        <form onSubmit={onSubmit} className="flex w-full gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={onActionsToggle}
              className="bg-primary text-primary-foreground px-3 sm:px-4 py-3 rounded-lg shadow-lg transition-all hover:opacity-90 flex items-center justify-center"
              aria-label="Open actions menu"
              aria-expanded={showActionsPopup}
              tabIndex={0}
            >
              <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            <ActionsPopup
              isOpen={showActionsPopup}
              popupRef={actionsPopupRef}
              onActionClick={onActionClick}
            />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 w-full bg-background border border-border text-foreground px-3 sm:px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-inner transition-all text-sm"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              aria-label={placeholder}
            />
            {!input.trim() && !isFocused && animatedText && (
              <div
                className="absolute inset-0 flex items-center left-3 sm:left-4 text-sm text-muted-foreground pointer-events-none"
                aria-hidden="true"
              >
                <span className="opacity-70">{animatedText}</span>
                <span className="animate-pulse">|</span>
              </div>
            )}
            {!input.trim() && !isFocused && !animatedText && (
              <div
                className="absolute inset-0 flex items-center left-3 sm:left-4 text-sm text-muted-foreground pointer-events-none"
                aria-hidden="true"
              >
                {placeholder}
              </div>
            )}
          </div>
          <button
            type="submit"
            className={cn(
              "bg-primary text-primary-foreground px-4 sm:px-6 py-3 rounded-lg shadow-lg transition-all flex items-center justify-center",
              !input.trim() || isLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-90"
            )}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
