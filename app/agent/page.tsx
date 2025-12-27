"use client";

import React, { useState, useEffect } from "react";
import { useAgentStore, AgentConfig } from "@/lib/stores/agent-store";
import Image from "next/image";

import { GlassPanel } from "@/components/ui/glass-panel";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatsCard } from "@/components/ui/stats-card";
import { GlassChart } from "@/components/ui/glass-chart";

// Define types for performance data to avoid implicit 'any' and 'never' types
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

export default function AgentDashboardPage() {
  const { agents, isLoading, setAgents } = useAgentStore();
  const [runningAgents, setRunningAgents] = useState<number>(0);

  // Mock data for agent performance
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance>({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    data: [0, 0, 0, 0, 0, 0],
    strategies: [],
    activities: [],
  });

  // Load mock data
  useEffect(() => {
    // This would be replaced with API calls in production
    setTimeout(() => {
      const mockAgents: AgentConfig[] = [
        {
          id: "1",
          name: "DeFi Optimizer",
          type: "OPTIMIZER",
          description: "Optimizes portfolio allocations across DeFi protocols",
          parameters: {
            optimizeInterval: "weekly",
            riskTolerance: "moderate",
            rebalanceThreshold: 5,
          },
          strategyId: "1",
          isActive: true,
          lastRunAt: new Date(Date.now() - 86400000),
          createdAt: new Date(Date.now() - 30 * 86400000),
          updatedAt: new Date(Date.now() - 7 * 86400000),
        },
        {
          id: "2",
          name: "Yield Harvester",
          type: "YIELD",
          description:
            "Automatically harvests and compounds yield from various protocols",
          parameters: {
            compoundFrequency: "daily",
            gasThreshold: "medium",
            protocolsAllowed: ["aave", "compound", "yearn"],
          },
          strategyId: "2",
          isActive: true,
          lastRunAt: new Date(Date.now() - 3600000),
          createdAt: new Date(Date.now() - 60 * 86400000),
          updatedAt: new Date(Date.now() - 3 * 86400000),
        },
        {
          id: "3",
          name: "Risk Guardian",
          type: "RISK_MANAGEMENT",
          description:
            "Monitors portfolio risk metrics and suggests adjustments",
          parameters: {
            monitoringInterval: "12h",
            alertThreshold: "high",
            autoAdjust: false,
          },
          strategyId: "1",
          isActive: false,
          lastRunAt: new Date(Date.now() - 5 * 86400000),
          createdAt: new Date(Date.now() - 45 * 86400000),
          updatedAt: new Date(Date.now() - 10 * 86400000),
        },
      ];

      const mockPerformance: AgentPerformance = {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        data: [2.1, 3.5, 2.8, -0.5, 4.2, 5.1],
        strategies: [
          { id: "1", name: "Balanced DeFi", allocation: 60, performance: 3.8 },
          { id: "2", name: "High Yield", allocation: 30, performance: 6.2 },
          {
            id: "3",
            name: "Stablecoin Safety",
            allocation: 10,
            performance: 1.5,
          },
        ],
        activities: [
          {
            id: "1",
            agentId: "1",
            type: "REBALANCE",
            description: "Rebalanced portfolio to optimal allocations",
            timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
            changes: [
              { asset: "ETH", before: "30%", after: "25%", change: "-5%" },
              { asset: "AAVE", before: "15%", after: "20%", change: "+5%" },
            ],
          },
          {
            id: "2",
            agentId: "2",
            type: "YIELD_HARVEST",
            description: "Harvested and compounded yield from Yearn Finance",
            timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
            amount: 0.05,
            protocol: "Yearn",
          },
          {
            id: "3",
            agentId: "3",
            type: "RISK_ALERT",
            description: "Detected increased risk exposure in Optimism bridge",
            timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
            riskLevel: "moderate",
            recommendation: "Consider reducing exposure by 5%",
          },
          {
            id: "4",
            agentId: "2",
            type: "YIELD_HARVEST",
            description: "Harvested and compounded yield from Aave",
            timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
            amount: 125,
            protocol: "Aave",
          },
        ],
      };

      setAgents(mockAgents);
      setAgentPerformance(mockPerformance);
      setRunningAgents(mockAgents.filter((a) => a.isActive).length);
    }, 1000);
  }, [setAgents]);

  // Format date for display
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

  const getRiskColor = (level: string | undefined) => {
    switch (level) {
      case "high":
        return "text-red-400";
      case "moderate":
        return "text-yellow-400";
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-normal mb-6">AI Agent Dashboard</h1>

      {/* Agent Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Agents"
          value={`${runningAgents}`}
          subtitle={`of ${agents.length} total`}
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
          title="Portfolio Alpha"
          value="+4.2%"
          subtitle="vs. market benchmark"
          icon={<span className="text-xl">📈</span>}
          trend="up"
          change={2.1}
          loading={isLoading}
          interactive={false}
        />
        <StatsCard
          title="Last Rebalance"
          value={formatDate(
            agents.find((a) => a.type === "OPTIMIZER")?.lastRunAt
          )}
          subtitle="Auto-optimization"
          icon={<span className="text-xl">⚖️</span>}
          loading={isLoading}
          interactive={false}
        />
        <StatsCard
          title="Yield Harvested"
          value="$2,345"
          subtitle="Last 30 days"
          icon={<span className="text-xl">🌾</span>}
          trend="up"
          change={12.5}
          loading={isLoading}
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
              <button className="px-4 py-2 bg-primary-500/30 rounded text-sm  transition-colors">
                Add Agent
              </button>
            }
            loading={isLoading}
          >
            <div className="space-y-4">
              {agents.map((agent: AgentConfig) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}

              {agents.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No agents have been created yet.
                  </p>
                  <button className="px-6 py-2 bg-primary-500/30 rounded transition-colors">
                    Create Your First Agent
                  </button>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Agent Performance and Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <DashboardCard
            title="Agent Performance"
            icon={<span className="text-xl">📈</span>}
            loading={isLoading}
          >
            <div className="h-64 mb-4">
              <GlassChart
                data={agentPerformance.data}
                labels={agentPerformance.labels}
                showPoints
                gradient
                color="primary"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agentPerformance.strategies.map((strategy: Strategy) => (
                <GlassPanel
                  key={strategy.id}
                  className="p-3"
                  bordered
                  variant="plain"
                >
                  <div className="text-sm font-medium">{strategy.name}</div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      Allocation
                    </span>
                    <span className="text-xs">{strategy.allocation}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Performance
                    </span>
                    <span
                      className={`text-xs ${
                        strategy.performance > 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {strategy.performance > 0 ? "+" : ""}
                      {strategy.performance}%
                    </span>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </DashboardCard>

          {/* Agent Activity */}
          <DashboardCard
            title="Recent Agent Activity"
            icon={<span className="text-xl">📋</span>}
            loading={isLoading}
          >
            <div className="space-y-3">
              {agentPerformance.activities
                .slice(0, 5)
                .map((activity: Activity) => (
                  <GlassPanel
                    key={activity.id}
                    className="p-3"
                    bordered
                    variant="plain"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activity.type === "REBALANCE"
                              ? "bg-primary-500"
                              : activity.type === "YIELD_HARVEST"
                              ? "bg-green-500"
                              : activity.type === "RISK_ALERT"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <span className="font-medium">
                          {activity.type === "REBALANCE"
                            ? "Portfolio Rebalanced"
                            : activity.type === "YIELD_HARVEST"
                            ? "Yield Harvested"
                            : activity.type === "RISK_ALERT"
                            ? "Risk Alert"
                            : activity.type}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.description}
                    </p>

                    {activity.type === "REBALANCE" && activity.changes && (
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {activity.changes.map((change, i: number) => (
                          <div key={i}>
                            Rebalanced {change.asset}: {change.before}% →{" "}
                            {change.after}%
                          </div>
                        ))}
                      </div>
                    )}
                    {activity.type === "YIELD_HARVEST" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Harvested: {activity.amount} {activity.protocol}
                      </p>
                    )}
                    {activity.type === "RISK_ADJUSTMENT" &&
                      activity.riskLevel && (
                        <p className="text-xs text-muted-foreground mt-1">
                          New Risk Level:{" "}
                          <span
                            className={`font-semibold ${getRiskColor(
                              activity.riskLevel
                            )}`}
                          >
                            {activity.riskLevel}
                          </span>
                        </p>
                      )}
                    {activity.recommendation && (
                      <p className="text-xs bg-muted p-2 rounded mt-2">
                        Recommendation: {activity.recommendation}
                      </p>
                    )}
                  </GlassPanel>
                ))}

              {agentPerformance.activities.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentConfig }) {
  const [expanded, setExpanded] = useState(false);

  // Get type-specific icon
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

  // Format date for display
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

          <div className=" p-3 rounded">
            <h4 className="text-sm font-medium mb-2">Configuration</h4>
            <div className="space-y-1 text-xs">
              {Object.entries(agent.parameters).map(([key, value]) => (
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
                      : value.toString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button className="flex-1 px-3 py-1.5 bg-primary-500/30 rounded text-sm  transition-colors">
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
