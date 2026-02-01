"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAgentStore, AgentConfig } from "@/lib/stores/agent-store";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { Shield, Lock, AlertTriangle, CheckCircle, RefreshCw, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { GlassPanel } from "@/components/ui/glass-panel";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatsCard } from "@/components/ui/stats-card";
import { GlassChart } from "@/components/ui/glass-chart";

interface Strategy {
  id: string;
  name: string;
  allocation: number;
  performance: number;
}

interface Activity {
  id: string;
  agentId: string;
  type: string;
  description: string;
  timestamp: string;
  changes?: { asset: string; before: string; after: string; change: string }[];
  amount?: number;
  protocol?: string;
  riskLevel?: string;
  recommendation?: string;
}

interface AgentPerformance {
  labels: string[];
  data: number[];
  strategies: Strategy[];
  activities: Activity[];
}

interface GuardrailTelemetry {
  dailyCapUsd: number;
  spentLast24hUsd: number;
  remainingUsd: number;
  whitelistedCount: number;
  whitelistedContracts?: Record<string, string>;
  sessionKeys?: any[];
}

export default function AgentDashboardPage() {
  const { agents, isLoading, setAgents, setLoading } = useAgentStore();
  const { userWalletAddress } = useAuthWallet();
  const { getAccessToken, user: privyUser } = usePrivy();

  const [runningAgents, setRunningAgents] = useState<number>(0);
  const [guardrails, setGuardrails] = useState<GuardrailTelemetry | null>(null);
  const [isLoadingGuardrails, setIsLoadingGuardrails] = useState<boolean>(true);
  const [isUpdatingCap, setIsUpdatingCap] = useState<boolean>(false);

  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance>({
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    data: [0, 0, 0, 0],
    strategies: [],
    activities: [],
  });

  // Fetch live guardrail data & agents
  const fetchData = useCallback(async () => {
    if (!userWalletAddress) return;

    try {
      setIsLoadingGuardrails(true);
      setLoading(true);
      const tokenJwt = await getAccessToken();
      const authHeader: Record<string, string> = tokenJwt ? { Authorization: `Bearer ${tokenJwt}` } : {};

      // 1. Fetch live spend guardrails
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
          whitelistedCount: data.whitelistedCount ?? 10,
          whitelistedContracts: data.whitelistedContracts,
          sessionKeys: data.sessionKeys || [],
        });
      }

      // 2. Fetch live agents for this user
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
      console.warn("[AGENT DASHBOARD] Error loading live agent data:", err);
    } finally {
      setIsLoadingGuardrails(false);
      setLoading(false);
    }
  }, [userWalletAddress, getAccessToken, privyUser?.id, setAgents, setLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    } catch (err) {
      toast.error("Error updating guardrail cap");
    } finally {
      setIsUpdatingCap(false);
    }
  };

  const formatDate = (dateString: Date | string | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Autonomous Agent Runtime</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scoped execution, automated rebalancing, and non-custodial spend guardrails.
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border/60 rounded-lg hover:bg-secondary/40 transition-colors w-fit"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          Refresh Status
        </button>
      </div>

      {/* Security Guardrail Banner */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground">Spend Guardrails Active</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Enforced
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Strict 0.5% max slippage ceiling • Verified DeFi whitelist destination verification • Non-custodial session keys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUpdateCap(25)}
            disabled={isUpdatingCap}
            className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
              guardrails?.dailyCapUsd === 25
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            $25/day
          </button>
          <button
            onClick={() => handleUpdateCap(50)}
            disabled={isUpdatingCap}
            className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
              guardrails?.dailyCapUsd === 50
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            $50/day (Default)
          </button>
          <button
            onClick={() => handleUpdateCap(100)}
            disabled={isUpdatingCap}
            className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
              guardrails?.dailyCapUsd === 100
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            $100/day
          </button>
        </div>
      </div>

      {/* Agent Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Agents"
          value={`${runningAgents}`}
          subtitle={`of ${agents.length} configured`}
          icon={
            <Image
              src="/logo.png"
              alt="Agent"
              width={24}
              height={24}
              className="text-xl"
            />
          }
          loading={isLoading}
          interactive={false}
        />
        <StatsCard
          title="Daily Spend Cap"
          value={`$${(guardrails?.dailyCapUsd ?? 50.0).toFixed(2)}`}
          subtitle="Rolling 24h ceiling"
          icon={<Lock className="text-primary w-5 h-5" />}
          loading={isLoadingGuardrails}
          interactive={false}
        />
        <StatsCard
          title="Remaining Allowance"
          value={`$${(guardrails?.remainingUsd ?? 50.0).toFixed(2)}`}
          subtitle={`$${(guardrails?.spentLast24hUsd ?? 0.0).toFixed(2)} spent in 24h`}
          icon={<Shield className="text-emerald-400 w-5 h-5" />}
          loading={isLoadingGuardrails}
          interactive={false}
        />
        <StatsCard
          title="Verified Protocols"
          value={`${guardrails?.whitelistedCount ?? 10}`}
          subtitle="Destination whitelist"
          icon={<CheckCircle className="text-blue-400 w-5 h-5" />}
          loading={isLoadingGuardrails}
          interactive={false}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1 space-y-6">
          <DashboardCard
            title="Your Agents"
            action={
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-medium transition-colors">
                <Plus size={14} />
                Deploy Agent
              </button>
            }
            loading={isLoading}
          >
            <div className="space-y-4">
              {agents.map((agent: AgentConfig) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}

              {agents.length === 0 && !isLoading && (
                <div className="text-center py-10 px-4 border border-dashed border-border/60 rounded-xl">
                  <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                  <p className="font-medium text-sm mb-1">No agents configured yet</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
                    Deploy an autonomous agent to balance your portfolio within safe spend guardrails.
                  </p>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
                    Deploy First Agent
                  </button>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Performance and Guardrail Policy */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardCard
            title="Spend Policy & Delegation Telemetry"
            icon={<Shield className="text-primary w-5 h-5" />}
            loading={isLoadingGuardrails}
          >
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border/50 bg-secondary/20">
                  <span className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                    Execution Mode
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-sm">ERC-7715 Non-Custodial Delegation</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Smart accounts execute via scoped permission tokens without sharing private keys.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-secondary/20">
                  <span className="text-xs text-muted-foreground uppercase font-medium tracking-wider">
                    Uniswap Slippage Clamping
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-sm">0.50% Maximum Slippage</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Swaps exceeding 0.5% tolerance are automatically clamped before router submission.
                  </p>
                </div>
              </div>

              {/* Protocol Whitelist List */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                    Permitted Protocol Contracts ({guardrails?.whitelistedCount ?? 10})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Base Mainnet & Sepolia</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {guardrails?.whitelistedContracts &&
                    Object.entries(guardrails.whitelistedContracts).map(([addr, name]) => (
                      <div
                        key={addr}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-secondary/10"
                      >
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {addr.slice(0, 6)}...{addr.slice(-4)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Performance Chart */}
          <DashboardCard
            title="Agent Activity & Performance"
            icon={<span className="text-xl">📈</span>}
            loading={isLoading}
          >
            <div className="h-48 mb-4">
              <GlassChart
                data={agentPerformance.data}
                labels={agentPerformance.labels}
                showPoints
                gradient
                color="primary"
              />
            </div>
            <div className="text-center py-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Autonomous actions run within verified limits and log real-time execution receipts.
              </p>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentConfig }) {
  const [expanded, setExpanded] = useState(false);

  const getAgentIcon = (type: string) => {
    switch (type) {
      case "OPTIMIZER":
        return "⚖️";
      case "YIELD":
        return "🌾";
      case "RISK_MANAGEMENT":
        return "🛡️";
      default:
        return <Image src="/logo.png" alt="Agent" width={24} height={24} />;
    }
  };

  const formatDate = (dateString: Date | string | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <GlassPanel
      className="p-4 transition-all duration-300"
      bordered
      variant="plain"
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getAgentIcon(agent.type)}</span>
          <div>
            <h3 className="font-semibold">{agent.name}</h3>
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                  agent.isActive
                    ? "bg-green-900/30 text-green-400"
                    : "bg-red-900/30 text-red-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 mr-1 rounded-full ${
                    agent.isActive ? "bg-green-400 animate-pulse" : "bg-red-400"
                  }`}
                />
                {agent.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-xs text-white/60">
                {agent.type.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-white/60 hover:text-white"
          >
            {expanded ? "−" : "+"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-white/70">{agent.description}</p>

          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-white/60">Last Run</span>
              <span>{formatDate(agent.lastRunAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Created</span>
              <span>{formatDate(agent.createdAt)}</span>
            </div>
          </div>

          <div className="p-3 rounded bg-secondary/30">
            <h4 className="text-sm font-medium mb-2">Configuration</h4>
            <div className="space-y-1 text-xs">
              {Object.entries(agent.parameters || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-white/60">
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())}
                  </span>
                  <span>
                    {Array.isArray(value)
                      ? value.join(", ")
                      : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button className="flex-1 px-3 py-1.5 bg-primary/30 rounded text-sm hover:bg-primary/40 transition-colors">
              Configure
            </button>
            <button
              className={`flex-1 px-3 py-1.5 rounded text-sm ${
                agent.isActive
                  ? "bg-red-500/30 hover:bg-red-500/50"
                  : "bg-green-500/30 hover:bg-green-500/50"
              } transition-colors`}
            >
              {agent.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
