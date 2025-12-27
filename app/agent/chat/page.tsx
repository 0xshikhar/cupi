"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { usePrivyWallet } from "@/lib/hooks/usePrivyWallet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChatMessages } from "./hooks/use-chat-messages";
import { useChatScroll } from "./hooks/use-chat-scroll";
import { useActionsPopup } from "./hooks/use-actions-popup";
import { WalletStatus } from "./components/WalletStatus";
import { MessageBubble } from "./components/MessageBubble";
import { PromptSuggestions } from "./components/PromptSuggestions";
import { ChatInput } from "./components/ChatInput";
import { ScrollToBottomButton } from "./components/ScrollToBottomButton";
import {
  sendChatMessage,
  validateWallet,
  formatErrorMessage,
  createMessage,
} from "./services/chat-api";
import type { ChatMode } from "./types/chat";

const AgentChatPage = () => {
  const [activeMode] = useState<ChatMode>("automation");
  const [hasMounted, setHasMounted] = useState(false);
  const {
    walletAddress,
    agentWalletStatus,
    agentWalletAddress,
    refreshAgentWallet,
  } = usePrivyWallet();
  const isMobile = useIsMobile();

  const [selectedAgent] = useState<string>("optimizer");
  const [isLoading, setIsLoading] = useState(false);
  const [automationInput, setAutomationInput] = useState("");
  const [researchInput, setResearchInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    automationMessages,
    setAutomationMessages,
    setResearchMessages,
  } = useChatMessages(activeMode);

  const { showActionsPopup, setShowActionsPopup, actionsPopupRef } =
    useActionsPopup();

  const {
    showScrollToBottom,
    chatContainerRef,
    messagesEndRef,
    scrollToBottom,
  } = useChatScroll(messages, activeMode);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handlePromptSuggestionClick = (prompt: string) => {
    if (activeMode === "automation") {
      setAutomationInput(prompt);
    } else {
      setResearchInput(prompt);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleActionPromptClick = (prompt: string) => {
    if (activeMode === "automation") {
      setAutomationInput(prompt);
    } else {
      setResearchInput(prompt);
    }
    setShowActionsPopup(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const currentInput =
      activeMode === "automation" ? automationInput : researchInput;
    if (!currentInput.trim()) return;

    const newUserMessage = createMessage(
      currentInput,
      "user",
      activeMode === "automation" ? selectedAgent : "research"
    );

    if (activeMode === "automation") {
      setAutomationMessages((prev) => [...prev, newUserMessage]);
      setAutomationInput("");
    } else {
      setResearchMessages((prev) => [...prev, newUserMessage]);
      setResearchInput("");
    }

    setIsLoading(true);

    try {
      if (activeMode === "automation") {
        if (!agentWalletStatus) {
          throw new Error("Agent wallet status is not available");
        }
        validateWallet(walletAddress, agentWalletStatus);

        const messageHistory: Array<{
          role: "user" | "assistant";
          content: string;
        }> = automationMessages.map((msg) => ({
          role:
            msg.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content,
        }));

        messageHistory.push({
          role: "user",
          content: currentInput,
        });

        const response = await sendChatMessage({
          userWalletAddress: walletAddress!,
          chain_id: "base-sepolia",
          agent_id: selectedAgent,
          session_id: `session_${walletAddress}_${selectedAgent}`,
          messageHistory,
        });

        if (response.agent_response) {
          const newAgentMessage = createMessage(
            response.agent_response,
            "agent",
            selectedAgent
          );
          setAutomationMessages((prev) => [...prev, newAgentMessage]);
          refreshAgentWallet();
        } else if (response.error) {
          const errorMessage = createMessage(
            `## Error\n\n**Details:** ${response.error}`,
            "agent",
            selectedAgent
          );
          setAutomationMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        setTimeout(() => {
          const researchResponse = createMessage(
            `## Research Results\n\n**Query:** "${currentInput}"\n\nThis is a mock research response with markdown formatting.\n\n* Point 1\n* Point 2\n* Point 3`,
            "agent",
            "research"
          );
          setResearchMessages((prev) => [...prev, researchResponse]);
        }, 1500);
        return;
      }
    } catch (error) {
      console.error("Failed to send message to agent:", error);

      const errorContent = formatErrorMessage(error);
      const errorMessage = createMessage(
        errorContent,
        "agent",
        activeMode === "automation" ? selectedAgent : "research"
      );

      if (activeMode === "automation") {
        setAutomationMessages((prev) => [...prev, errorMessage]);
      } else {
        setResearchMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const currentInput =
    activeMode === "automation" ? automationInput : researchInput;
  const setCurrentInput =
    activeMode === "automation" ? setAutomationInput : setResearchInput;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <WalletStatus
        walletAddress={walletAddress}
        agentWalletStatus={agentWalletStatus || "loading"}
        agentWalletAddress={agentWalletAddress}
      />

      <div className="relative flex flex-col flex-1 overflow-hidden">
        <div
          ref={chatContainerRef}
          className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto"
          style={{ paddingBottom: isMobile ? "120px" : "100px" }}
        >
          {messages.length === 0 && (
            <PromptSuggestions onPromptClick={handlePromptSuggestionClick} />
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              hasMounted={hasMounted}
            />
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <ScrollToBottomButton
        show={showScrollToBottom}
        onClick={scrollToBottom}
      />

      <ChatInput
        mode={activeMode}
        input={currentInput}
        onInputChange={setCurrentInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        showActionsPopup={showActionsPopup}
        actionsPopupRef={actionsPopupRef}
        inputRef={inputRef}
        onActionsToggle={() => setShowActionsPopup(!showActionsPopup)}
        onActionClick={handleActionPromptClick}
      />
    </div>
  );
};

export default AgentChatPage;
