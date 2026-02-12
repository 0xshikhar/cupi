'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAgentStore } from '@/lib/stores/agent-store';
import { 
  ArrowLeft, 
  Bot, 
  Shield, 
  Zap, 
  Sliders, 
  CheckCircle, 
  Check, 
  Lock, 
  Sparkles, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

const AGENT_ARCHETYPES = [
  {
    type: 'OPTIMIZER',
    title: 'Portfolio Optimizer',
    desc: 'Auto-rebalances crypto assets and clamps slippage on Uniswap V3.',
    icon: Sliders,
    accent: 'text-primary bg-primary/10 border-primary/30',
  },
  {
    type: 'YIELD',
    title: 'Yield Harvester',
    desc: 'Monitors APYs and auto-compounds liquidity into Moonwell and Aave.',
    icon: Zap,
    accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    type: 'RISK_MANAGEMENT',
    title: 'Risk Guardian',
    desc: 'Enforces strict 24h spend ceilings and revokes suspicious delegations.',
    icon: Shield,
    accent: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  },
];

function ConfigureAgentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id');
  const { agents, addAgent, updateAgent } = useAgentStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'OPTIMIZER',
    description: '',
    strategyId: '1',
    customInstructions: '',
    runtimeConfigText: '{\n  "riskTolerance": "moderate",\n  "allowExperimentalTools": false\n}',
    parameters: {
      optimizer: {
        optimizeInterval: 'weekly',
        riskTolerance: 'moderate',
        rebalanceThreshold: 5
      },
      yield: {
        compoundFrequency: 'daily',
        gasThreshold: 'medium',
        protocolsAllowed: ['aave', 'compound', 'yearn']
      },
      risk: {
        monitoringInterval: '12h',
        alertThreshold: 'medium',
        autoAdjust: false
      }
    },
    isActive: true
  });
  
  // Load agent data if editing existing agent
  useEffect(() => {
    if (agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setFormData({
          name: agent.name,
          type: agent.type,
          description: agent.description || '',
          strategyId: agent.strategyId || '1',
          customInstructions: agent.parameters?.customInstructions || '',
          runtimeConfigText:
            JSON.stringify(agent.parameters?.runtimeConfig || {
              riskTolerance: 'moderate',
              allowExperimentalTools: false,
            }, null, 2),
          parameters: {
            optimizer: agent.parameters?.optimizer || formData.parameters.optimizer,
            yield: agent.parameters?.yield || formData.parameters.yield,
            risk: agent.parameters?.risk || formData.parameters.risk
          },
          isActive: agent.isActive
        });
      }
    }
  }, [agentId, agents]);
  
  const strategies = [
    { id: '1', name: 'Balanced DeFi (Base Mainnet)', desc: 'Diversified stablecoin and bluechip yield' },
    { id: '2', name: 'High Yield Aggressive', desc: 'Maximizes supply APY with active rebalancing' },
    { id: '3', name: 'Stablecoin Safety Shield', desc: 'Strict USDC/USDT holding with 0.5% max slippage' }
  ];
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a name for the agent.');
      return;
    }

    setIsLoading(true);
    
    const specificParams = 
      formData.type === 'OPTIMIZER' ? formData.parameters.optimizer :
      formData.type === 'YIELD' ? formData.parameters.yield :
      formData.parameters.risk;

    try {
      let runtimeConfig: Record<string, unknown> = {};
      try {
        runtimeConfig = JSON.parse(formData.runtimeConfigText || '{}');
      } catch (error) {
        toast.error('Invalid Runtime Config JSON. Please check syntax.');
        setIsLoading(false);
        return;
      }

      if (agentId) {
        const existingAgent = agents.find(a => a.id === agentId);
        await updateAgent({
          id: agentId,
          name: formData.name,
          type: formData.type,
          description: formData.description,
          strategyId: formData.strategyId,
          parameters: {
            ...specificParams,
            customInstructions: formData.customInstructions,
            runtimeConfig,
          },
          isActive: formData.isActive,
          createdAt: existingAgent?.createdAt || new Date(),
          updatedAt: new Date()
        });
        toast.success(`Agent "${formData.name}" updated successfully!`);
      } else {
        await addAgent({
          id: crypto.randomUUID(),
          name: formData.name,
          type: formData.type,
          description: formData.description,
          strategyId: formData.strategyId,
          parameters: {
            ...specificParams,
            customInstructions: formData.customInstructions,
            runtimeConfig,
          },
          isActive: formData.isActive,
          createdAt: new Date(), 
          updatedAt: new Date()
        });
        toast.success(`Agent "${formData.name}" created — it now responds in chat.`);
      }
      
      router.push('/agent');
    } catch (error) {
      console.error('Failed to save agent:', error);
      toast.error('Failed to configure agent. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleParameterChange = (paramName: string, value: string | number | boolean | string[]) => {
    const agentType = formData.type === 'OPTIMIZER' ? 'optimizer' : 
                      formData.type === 'YIELD' ? 'yield' : 'risk';
                      
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [agentType]: {
          ...prev.parameters[agentType],
          [paramName]: value
        }
      }
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-4">
      {/* Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary flex items-center justify-center transition-colors shadow-sm text-foreground shrink-0"
            title="Back to Agent Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {agentId ? 'Edit Agent Strategy' : 'Deploy Autonomous Agent'}
                <span className="ml-2 align-middle text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-black text-white">Beta</span>
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                ERC-7715 Scoped
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure non-custodial execution guardrails, rebalance policies, and target protocols
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/agent"
            className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold transition-all text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Choose Archetype */}
        <div className="cupi-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-primary" />
            <h2 className="font-bold text-sm sm:text-base text-foreground">Select Agent Archetype</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AGENT_ARCHETYPES.map((arch) => {
              const Icon = arch.icon;
              const isSelected = formData.type === arch.type;
              return (
                <button
                  key={arch.type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: arch.type }))}
                  className={`p-4 rounded-2xl border text-left transition-all space-y-2.5 ${
                    isSelected
                      ? 'border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-secondary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${arch.accent}`}>
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-black shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{arch.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{arch.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Agent Identity */}
        <div className="cupi-card p-5 sm:p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-sm sm:text-base text-foreground">Agent Identity & Strategy</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Agent Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full py-2.5 px-3.5 bg-secondary/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-card transition-all placeholder:text-muted-foreground"
                placeholder="e.g., Base Alpha Optimizer"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Strategy Profile
              </label>
              <select
                name="strategyId"
                value={formData.strategyId}
                onChange={handleInputChange}
                className="w-full py-2.5 px-3.5 bg-secondary/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-card transition-all"
              >
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Objective & Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              className="w-full py-2.5 px-3.5 bg-secondary/40 border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-card transition-all placeholder:text-muted-foreground"
              placeholder="Describe the main goal of this agent (e.g., maintain 50% USDC reserve and compound Moonwell supply daily)."
            />
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border">
            <div className="space-y-0.5">
              <label htmlFor="isActive" className="text-xs font-bold text-foreground cursor-pointer">
                Immediate Activation
              </label>
              <p className="text-[11px] text-muted-foreground">
                Begin autonomous monitoring and session key evaluation immediately upon deployment
              </p>
            </div>
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 3: Fine-Tuning Archetype Parameters */}
        <div className="cupi-card p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm sm:text-base text-foreground">
              {formData.type === 'OPTIMIZER' && 'Portfolio Optimizer Guardrails'}
              {formData.type === 'YIELD' && 'Yield Harvester Automation'}
              {formData.type === 'RISK_MANAGEMENT' && 'Risk Guardian Telemetry'}
            </h2>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Clamped
            </span>
          </div>

          {formData.type === 'OPTIMIZER' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Rebalance Interval
                </label>
                <select
                  value={formData.parameters.optimizer.optimizeInterval}
                  onChange={(e) => handleParameterChange('optimizeInterval', e.target.value)}
                  className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                >
                  <option value="daily">Daily Evaluation</option>
                  <option value="weekly">Weekly Evaluation</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Risk Tolerance
                </label>
                <select
                  value={formData.parameters.optimizer.riskTolerance}
                  onChange={(e) => handleParameterChange('riskTolerance', e.target.value)}
                  className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                >
                  <option value="conservative">Conservative (Max 0.25% slippage)</option>
                  <option value="moderate">Moderate (Standard 0.50% slippage)</option>
                  <option value="aggressive">Aggressive (High liquidity)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Deviation Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.parameters.optimizer.rebalanceThreshold}
                  onChange={(e) => handleParameterChange('rebalanceThreshold', parseInt(e.target.value) || 5)}
                  className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          )}

          {formData.type === 'YIELD' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Compound Frequency
                  </label>
                  <select
                    value={formData.parameters.yield.compoundFrequency}
                    onChange={(e) => handleParameterChange('compoundFrequency', e.target.value)}
                    className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                  >
                    <option value="hourly">Hourly Auto-Compound</option>
                    <option value="daily">Daily Auto-Compound</option>
                    <option value="weekly">Weekly Auto-Compound</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Max Gas Price Threshold
                  </label>
                  <select
                    value={formData.parameters.yield.gasThreshold}
                    onChange={(e) => handleParameterChange('gasThreshold', e.target.value)}
                    className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                  >
                    <option value="low">Low (Wait for low base fees)</option>
                    <option value="medium">Medium (Standard Base fee)</option>
                    <option value="high">High (Execute regardless of congestion)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Permitted DeFi Protocols
                </label>
                <div className="flex flex-wrap gap-2">
                  {['aave', 'compound', 'yearn', 'moonwell'].map((protocol) => {
                    const isChecked = formData.parameters.yield.protocolsAllowed.includes(protocol);
                    return (
                      <button
                        key={protocol}
                        type="button"
                        onClick={() => {
                          const current = formData.parameters.yield.protocolsAllowed;
                          const next = isChecked ? current.filter(p => p !== protocol) : [...current, protocol];
                          handleParameterChange('protocolsAllowed', next);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isChecked
                            ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                            : 'bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-primary border-primary text-black' : 'border-muted-foreground'
                        }`}>
                          {isChecked && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="capitalize">{protocol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {formData.type === 'RISK_MANAGEMENT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Audit Frequency
                  </label>
                  <select
                    value={formData.parameters.risk.monitoringInterval}
                    onChange={(e) => handleParameterChange('monitoringInterval', e.target.value)}
                    className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                  >
                    <option value="1h">Every 1 Hour</option>
                    <option value="6h">Every 6 Hours</option>
                    <option value="12h">Every 12 Hours</option>
                    <option value="24h">Daily</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Alert Sensitivity
                  </label>
                  <select
                    value={formData.parameters.risk.alertThreshold}
                    onChange={(e) => handleParameterChange('alertThreshold', e.target.value)}
                    className="w-full py-2.5 px-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold"
                  >
                    <option value="low">Low (Conservative alerts)</option>
                    <option value="medium">Medium (Standard telemetry)</option>
                    <option value="high">High (Critical events only)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border">
                <div className="space-y-0.5">
                  <label htmlFor="autoAdjust" className="text-xs font-bold text-foreground cursor-pointer">
                    Autonomous Portfolio Defense
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically de-risk position into USDC if pool volatility exceeds 15%
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="autoAdjust"
                  checked={formData.parameters.risk.autoAdjust}
                  onChange={(e) => handleParameterChange('autoAdjust', e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Agent Instructions & Runtime Config */}
        <div className="cupi-card p-5 sm:p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-sm sm:text-base text-foreground">Custom Instructions & Runtime Config</h2>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Natural Language Prompt Instructions
            </label>
            <textarea
              name="customInstructions"
              value={formData.customInstructions}
              onChange={handleInputChange}
              rows={3}
              className="w-full py-2.5 px-3.5 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-primary focus:bg-card transition-all placeholder:text-muted-foreground"
              placeholder="e.g., Prioritize base-mainnet pools. Never supply liquidity if gas base fee exceeds 5 gwei. Keep at least $20 liquid in wallet at all times."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Runtime Config (JSON)
            </label>
            <textarea
              name="runtimeConfigText"
              value={formData.runtimeConfigText}
              onChange={handleInputChange}
              rows={4}
              className="w-full py-2.5 px-3.5 bg-secondary/40 border border-border rounded-xl font-mono text-xs focus:outline-none focus:border-primary focus:bg-card transition-all"
              placeholder='{"allowExperimentalTools": false}'
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/agent"
            className="py-3 px-5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold transition-all text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary py-3 px-6 rounded-xl text-xs font-bold flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all shadow-sm"
          >
            <CheckCircle size={15} />
            <span>{isLoading ? 'Saving...' : agentId ? 'Update Agent' : 'Deploy Autonomous Agent'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ConfigureAgentPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm font-medium text-muted-foreground">Loading configuration...</div>}>
      <ConfigureAgentForm />
    </React.Suspense>
  );
}
