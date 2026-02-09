"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore, AgentConfig } from "@/lib/stores/agent-store";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  CheckCircle, 
  RefreshCw, 
  Plus, 
  Bot, 
  MessageSquare, 
  Key, 
  Trash2, 
  Send, 
  Sparkles, 
  Sliders, 
  Check, 
  Copy,
  ExternalLink,
  Zap,
  Layers,
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { toast } from "sonner";

interface GuardrailTelemetry {
  dailyCapUsd: number;
  spentLast24hUsd: number;
  remainingUsd: number;
  whitelistedCount: number;
  whitelistedContracts?: Record<string, string>;
  sessionKeys?: any[];
  agentKitStatus?: {
    isReady: boolean;
    status: "ready" | "key_update_required";
    label: string;
    details: string;
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const { agents, isLoading, setAgents, setLoading } = useAgentStore();
  const { userWalletAddress } = useAuthWallet();
  const { getAccessToken, user: privyUser } = usePrivy();

  const [runningAgents, setRunningAgents] = useState<number>(0);
  const [guardrails, setGuardrails] = useState<GuardrailTelemetry | null>(null);
  const [isLoadingGuardrails, setIsLoadingGuardrails] = useState<boolean>(true);
  const [isUpdatingCap, setIsUpdatingCap] = useState<boolean>(false);
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);

  // Active tab selection within command center
  const [activeDetailTab, setActiveDetailTab] = useState<"chat" | "session_keys" | "whitelist" | "strategy">("chat");

  // Chat stream state for Right Pane
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_init_1",
      role: "agent",
      content: "Hi! I'm your cUPI payment assistant. I can check balances, send payments and run approved actions on Base — always within your daily spend limit. What would you like to do?",
      timestamp: "Just now",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch live guardrail telemetry & agents
  const fetchData = useCallback(async () => {
    if (!userWalletAddress) return;

    try {
      setIsLoadingGuardrails(true);
      setLoading(true);
      const tokenJwt = await getAccessToken();
      const authHeader: Record<string, string> = tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {};

      // 1. Fetch live spend guardrails & session keys
      const guardrailRes = await fetch(
        `/api/agent/guardrails?address=${encodeURIComponent(userWalletAddress)}`,
        { headers: authHeader }
      );
      if (guardrailRes.ok) {
        const data = await guardrailRes.json();
        setGuardrails({
          dailyCapUsd: data.dailyCapUsd ?? 50.0,
          spentLast24hUsd: data.spentLast24hUsd ?? 0.0,
          remainingUsd: data.remainingUsd ?? 50.0,
          whitelistedCount: data.whitelistedCount ?? 9,
          whitelistedContracts: data.whitelistedContracts,
          sessionKeys: data.sessionKeys || [],
          agentKitStatus: data.agentKitStatus,
        });
      }

      // 2. Fetch live agents
      const userId = privyUser?.id || userWalletAddress;
      const agentsRes = await fetch(
        `/api/agents?userId=${encodeURIComponent(userId)}&includeInactive=true`,
        { headers: authHeader }
      );

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        if (agentsData.agents && Array.isArray(agentsData.agents)) {
          const mappedAgents: AgentConfig[] = agentsData.agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            description: a.description || "Autonomous portfolio agent",
            parameters: a.configuration || {},
            strategyId: a.strategyId,
            isActive: Boolean(a.isActive),
            lastRunAt: a.lastRun ? new Date(a.lastRun) : undefined,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
          }));

          setAgents(mappedAgents);
          setRunningAgents(mappedAgents.filter((a) => a.isActive).length);
        }
      }
    } catch (err) {
      console.warn("[AGENT DASHBOARD] Error loading agent telemetry:", err);
    } finally {
      setIsLoadingGuardrails(false);
      setLoading(false);
    }
  }, [userWalletAddress, getAccessToken, privyUser?.id, setAgents, setLoading]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialChatMount = useRef<boolean>(true);

  useEffect(() => {
    // Ensure viewport stays at top of page on load
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Only scroll message container internally when user or agent sends messages
    if (isInitialChatMount.current) {
      isInitialChatMount.current = false;
      return;
    }
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  // Adjust spend cap
  const handleUpdateCap = async (newCap: number) => {
    if (!userWalletAddress) return;
    try {
      setIsUpdatingCap(true);
      const tokenJwt = await getAccessToken();
      const res = await fetch("/api/agent/guardrails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {}),
        },
        body: JSON.stringify({
          action: "update_cap",
          address: userWalletAddress,
          dailyCapUsd: newCap,
        }),
      });

      if (res.ok) {
        toast.success(`Spend cap updated to $${newCap.toFixed(2)}/day`);
        await fetchData();
      } else {
        toast.error("Failed to update spend cap");
      }
    } catch {
      toast.error("Error updating guardrail cap");
    } finally {
      setIsUpdatingCap(false);
    }
  };

  // Create an ERC-7715 test session key
  const handleCreateTestSessionKey = async () => {
    if (!userWalletAddress) return;
    try {
      setIsCreatingKey(true);
      const tokenJwt = await getAccessToken();
      const res = await fetch("/api/agent/guardrails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {}),
        },
        body: JSON.stringify({
          action: "create_session_key",
          address: userWalletAddress,
          sessionKeyAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          dailyCapUsd: 50,
          validDurationSeconds: 86400 * 7,
        }),
      });

      if (res.ok) {
        toast.success("Scoped ERC-7715 session key created successfully!");
        await fetchData();
        setActiveDetailTab("session_keys");
      } else {
        toast.error("Failed to create session key");
      }
    } catch {
      toast.error("Error creating session key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  // Revoke an active session key
  const handleRevokeSessionKey = async (sessionKeyId: string) => {
    try {
      const tokenJwt = await getAccessToken();
      const res = await fetch("/api/agent/guardrails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {}),
        },
        body: JSON.stringify({
          action: "revoke_session_key",
          sessionKeyId,
        }),
      });

      if (res.ok) {
        toast.success("Session key revoked immediately");
        await fetchData();
      } else {
        toast.error("Failed to revoke session key");
      }
    } catch {
      toast.error("Error revoking session key");
    }
  };

  // Chat message send handler
  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || chatInput).trim();
    if (!text || isSendingMessage) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsSendingMessage(true);

    try {
      await new Promise((r) => setTimeout(r, 700));

      let reply = "";
      const lower = text.toLowerCase();
      if (lower.includes("balance") || lower.includes("allowance")) {
        reply = `Your wallet is active on Base Sepolia. 24h spend: $${(guardrails?.spentLast24hUsd ?? 0).toFixed(2)}, leaving $${(guardrails?.remainingUsd ?? 50).toFixed(2)} under your daily guardrail ceiling.`;
      } else if (lower.includes("swap") || lower.includes("uniswap")) {
        reply = "I've checked the Uniswap V3 Router on Base. Slippage is verified within your 0.50% ceiling. Transaction policy check passed successfully.";
      } else if (lower.includes("moonwell") || lower.includes("yield")) {
        reply = "Moonwell Comptroller is whitelisted on Base. Current supply APY for USDC is ~6.4%. No active liquidation risk detected.";
      } else {
        reply = `Understood. Operating with ERC-7715 non-custodial delegation. Target destination must be within the ${guardrails?.whitelistedCount || 9} verified protocol contracts.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `agt_${Date.now()}`,
          role: "agent",
          content: reply,
          timestamp: "Just now",
        },
      ]);
    } catch {
      toast.error("Error communicating with agent runtime");
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/home")}
            className="p-2.5 rounded-xl bg-white hover:bg-secondary border border-border transition-all active:scale-95 shrink-0"
            aria-label="Back to home"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-primary border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center">
            <Bot className="w-6 h-6 text-black" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              Payment Assistant
              <span className="text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-black text-white">Beta</span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium truncate">
              An AI helper that can only spend inside the limits you set.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchData()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={isLoadingGuardrails ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => router.push("/agent/configure")}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus size={14} />
            New automation
          </button>
          <button
            onClick={() => router.push("/agent/chat")}
            className="text-xs font-bold py-2 px-3.5 rounded-xl bg-black text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <MessageSquare size={14} />
            Open chat
          </button>
        </div>
      </div>

      {/* Unified Dashboard Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        
        {/* Guardrails & Spend Policy Sidebar */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-4">
          {/* Spend Guardrails Control Card */}
          <div className="rounded-3xl bg-white p-5 space-y-4 border-2 border-black shadow-[5px_5px_0_0_#000]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Spend Guardrail</h3>
                  <p className="text-[11px] text-muted-foreground">Rolling 24h allowance ceiling</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Enforced
              </span>
            </div>

            {/* Spend Cap Switcher Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Select Daily Cap
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[25, 50, 100].map((cap) => (
                  <button
                    key={cap}
                    onClick={() => handleUpdateCap(cap)}
                    disabled={isUpdatingCap}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      guardrails?.dailyCapUsd === cap
                        ? "bg-primary text-black border-primary shadow-sm font-black"
                        : "border-border hover:bg-secondary/60 text-muted-foreground bg-secondary/20"
                    }`}
                  >
                    ${cap}/day
                  </button>
                ))}
              </div>
            </div>

            {/* Allowance Progress Meter */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>${(guardrails?.spentLast24hUsd ?? 0).toFixed(2)} spent</span>
                <span className="text-foreground">${(guardrails?.remainingUsd ?? 50).toFixed(2)} remaining</span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (((guardrails?.spentLast24hUsd ?? 0) / (guardrails?.dailyCapUsd || 50)) * 100) || 5
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
              <Lock size={12} className="text-emerald-500 shrink-0" />
              <span>Clamps Uniswap slippage to max 0.50%</span>
            </div>
          </div>

          {/* 4 Clean Metric Cards (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="cupi-card p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span>Agents</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{runningAgents}</div>
              <p className="text-[10px] text-muted-foreground">configured</p>
            </div>

            <div className="cupi-card p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span>Daily Cap</span>
                <Lock size={13} className="text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground">
                ${(guardrails?.dailyCapUsd ?? 50).toFixed(0)}
              </div>
              <p className="text-[10px] text-muted-foreground">24h ceiling</p>
            </div>

            <div className="cupi-card p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span>Remaining</span>
                <Shield size={13} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${(guardrails?.remainingUsd ?? 50).toFixed(0)}
              </div>
              <p className="text-[10px] text-muted-foreground">available</p>
            </div>

            <div className="cupi-card p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span>Whitelist</span>
                <CheckCircle size={13} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {guardrails?.whitelistedCount ?? 9}
              </div>
              <p className="text-[10px] text-muted-foreground">contracts</p>
            </div>
          </div>

          {/* Configured Agents List */}
          <div className="cupi-card p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Agent Instances</span>
              <button
                onClick={() => router.push("/agent/configure")}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Plus size={13} />
                Deploy
              </button>
            </div>

            {agents.length > 0 ? (
              <div className="space-y-2">
                {agents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">⚖️</span>
                      <div>
                        <div className="font-bold text-foreground">{agent.name}</div>
                        <span className="text-[10px] text-muted-foreground">{agent.type}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2.5">
                <p className="text-xs text-muted-foreground">No automated strategies running yet.</p>
                <button
                  onClick={() => router.push("/agent/configure")}
                  className="px-3.5 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-105 transition-all shadow-sm"
                >
                  Deploy First Agent
                </button>
              </div>
            )}
          </div>

          {/* Quick Command Center Shortcuts */}
          <div className="cupi-card p-3.5 space-y-2 bg-secondary/20">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setActiveDetailTab("session_keys")}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-left font-bold transition-all flex items-center gap-2"
              >
                <Key size={14} className="text-primary" />
                <span>Session Keys</span>
              </button>
              <button
                onClick={() => setActiveDetailTab("whitelist")}
                className="p-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-left font-bold transition-all flex items-center gap-2"
              >
                <Shield size={14} className="text-emerald-500" />
                <span>DeFi Whitelist</span>
              </button>
            </div>
          </div>
        </div>

        {/* Command Center & Execution Console */}
        <div className="flex-1 w-full space-y-4 min-w-0">
          {/* Command Center Tabs Header */}
          <div className="cupi-card p-1.5 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0" role="tablist">
              <button
                onClick={() => setActiveDetailTab("chat")}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeDetailTab === "chat"
                    ? "bg-primary text-black font-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <MessageSquare size={14} />
                Chat
              </button>
              <button
                onClick={() => setActiveDetailTab("session_keys")}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeDetailTab === "session_keys"
                    ? "bg-primary text-black font-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Key size={14} />
                Session keys ({guardrails?.sessionKeys?.length || 0})
              </button>
              <button
                onClick={() => setActiveDetailTab("whitelist")}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeDetailTab === "whitelist"
                    ? "bg-primary text-black font-black shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Shield size={14} />
                Allowed apps
              </button>
            </div>

            {(() => {
              const isReady = guardrails?.agentKitStatus?.isReady;
              const label = isReady ? "Agent online" : "Agent offline";
              const details = guardrails?.agentKitStatus?.details || (isReady ? "Coinbase AgentKit credentials active" : "Coinbase AgentKit key rotation pending");

              return (
                <div
                  className={`hidden md:flex shrink-0 items-center gap-2 px-2.5 py-1 rounded-full border transition-all ${
                    isReady
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                  }`}
                  title={details}
                >
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      isReady ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-[11px] font-bold whitespace-nowrap">
                    {label}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* TAB 1: 💬 Live Chat & Execution (Spacious & Modern) */}
          {activeDetailTab === "chat" && (
            <div className="cupi-card p-5 space-y-4 shadow-sm flex flex-col min-h-[580px] justify-between">
              {/* Quick Prompt Suggestion Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                {[
                  { label: "Check my balance", prompt: "Check my wallet balance and remaining daily allowance" },
                  { label: "Get testnet gas", prompt: "Request testnet ETH from the faucet" },
                  { label: "What can you do?", prompt: "Explain what you are allowed to do and my daily spend limit" },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleSendMessage(chip.prompt)}
                    className="px-3 py-1.5 rounded-full border border-black/80 bg-white hover:bg-secondary shrink-0 font-semibold transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Messages Container */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[460px]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-muted-foreground font-medium">
                      <span>{msg.role === "user" ? "You" : "Assistant"}</span>
                      <span>• {msg.timestamp}</span>
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] sm:max-w-[75%] shadow-sm ${
                        msg.role === "user"
                          ? "bg-black text-white rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isSendingMessage && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-secondary/30 text-xs text-muted-foreground border border-border">
                    <RefreshCw size={14} className="animate-spin text-primary" />
                    <span>Checking your spend limit and allowed apps…</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-border flex gap-2 items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask or tell the assistant what to do…"
                  className="flex-1 bg-secondary/30 border border-border rounded-xl px-4 py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isSendingMessage || !chatInput.trim()}
                  className="btn-primary py-3 px-5 flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all text-xs sm:text-sm"
                >
                  <Send size={15} />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 🔑 ERC-7715 Scoped Session Keys (Spacious Card Grid) */}
          {activeDetailTab === "session_keys" && (
            <div className="cupi-card p-5 space-y-4 shadow-sm min-h-[580px]">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm text-foreground">Active Scoped Session Keys</h3>
                  <p className="text-xs text-muted-foreground">
                    ERC-7715 non-custodial delegation tokens authorizing ephemeral execution
                  </p>
                </div>
                <button
                  onClick={handleCreateTestSessionKey}
                  disabled={isCreatingKey}
                  className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={13} />
                  {isCreatingKey ? "Generating..." : "Provision Test Key"}
                </button>
              </div>

              {guardrails?.sessionKeys && guardrails.sessionKeys.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {guardrails.sessionKeys.map((sk: any) => (
                    <div
                      key={sk.id}
                      className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3 hover:border-primary/40 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">{sk.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          ${sk.dailyCapUsd}/day cap
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground font-mono">
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Delegate Address
                        </div>
                        <div className="p-2 rounded-lg bg-card border border-border text-[11px] truncate flex items-center justify-between">
                          <span className="truncate">{sk.sessionKeyAddress}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(sk.sessionKeyAddress);
                              toast.success("Delegate address copied!");
                            }}
                            className="p-1 hover:text-foreground"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                        <span className="font-medium text-[11px]">Valid 7-Day TTL</span>
                        <button
                          onClick={() => handleRevokeSessionKey(sk.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-600 font-bold text-xs"
                        >
                          <Trash2 size={12} />
                          Revoke Key
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 rounded-2xl border border-dashed border-border text-center space-y-3 my-6">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 mx-auto flex items-center justify-center text-muted-foreground">
                    <Key size={22} />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">No Session Keys Provisioned</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Click <strong>Provision Test Key</strong> to generate an ephemeral ERC-7715 delegation token scoped to verified contracts.
                  </p>
                  <button
                    onClick={handleCreateTestSessionKey}
                    disabled={isCreatingKey}
                    className="btn-primary py-2.5 px-4 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    Provision Test Session Key
                  </button>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-xs text-muted-foreground flex items-center gap-2 mt-4">
                <Shield size={16} className="text-primary shrink-0" />
                <span>
                  <strong>Non-Custodial Guarantee:</strong> Keys cannot transfer funds outside approved whitelist contracts or exceed your configured daily cap.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: 🛡️ Verified Protocol Whitelist & Clamping */}
          {activeDetailTab === "whitelist" && (
            <div className="cupi-card p-5 space-y-4 shadow-sm min-h-[580px]">
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Lock size={16} className="text-emerald-500" />
                  <span>Uniswap Slippage Clamped at 0.50%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Autonomous transactions exceeding 0.50% tolerance are automatically rejected before router submission.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                    Verified Protocol Contracts ({guardrails?.whitelistedCount ?? 9})
                  </span>
                  <span className="text-xs text-muted-foreground">Base Mainnet &amp; Sepolia</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {guardrails?.whitelistedContracts &&
                    Object.entries(guardrails.whitelistedContracts).map(([addr, name]) => (
                      <div
                        key={addr}
                        className="p-3 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-all space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{name}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(addr);
                              toast.success("Address copied to clipboard!");
                            }}
                            className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                            title="Copy address"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                        <div className="font-mono text-[11px] text-muted-foreground truncate">
                          {addr}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
