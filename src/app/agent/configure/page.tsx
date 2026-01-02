'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAgentStore } from '@/lib/stores/agent-store';
import { usePortfolioStore } from '@/lib/stores/portfolio-store';
import { DashboardCard } from '@/components/ui/dashboard-card';

function ConfigureAgentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id');
  const { agents, addAgent, updateAgent } = useAgentStore();
  const { /* portfolios */ } = usePortfolioStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'OPTIMIZER',
    description: '',
    strategyId: '',
    parameters: {
      // Default parameters for different agent types
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
    isActive: false
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
          strategyId: agent.strategyId || '',
          parameters: {
            optimizer: agent.parameters?.optimizer || formData.parameters.optimizer,
            yield: agent.parameters?.yield || formData.parameters.yield,
            risk: agent.parameters?.risk || formData.parameters.risk
          },
          isActive: agent.isActive
        });
      }
    }
  }, [agentId, agents, formData.parameters.optimizer, formData.parameters.yield, formData.parameters.risk]);
  
  // Mock strategies for selection
  const [strategies] = useState([
    { id: '1', name: 'Balanced DeFi', portfolioId: '1' },
    { id: '2', name: 'High Yield', portfolioId: '1' },
    { id: '3', name: 'Stablecoin Safety', portfolioId: '2' }
  ]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Determine which parameters to use based on agent type
    const specificParams = 
      formData.type === 'OPTIMIZER' ? formData.parameters.optimizer :
      formData.type === 'YIELD' ? formData.parameters.yield :
      formData.parameters.risk;
    
    try {
      if (agentId) {
        // Find the existing agent to get its createdAt date
        const existingAgent = agents.find(a => a.id === agentId);
        
        // Update existing agent
        await updateAgent({
          id: agentId,
          name: formData.name,
          type: formData.type,
          description: formData.description,
          strategyId: formData.strategyId,
          parameters: specificParams,
          isActive: formData.isActive,
          createdAt: existingAgent?.createdAt || new Date(),
          updatedAt: new Date()
        });
      } else {
        // Create new agent
        await addAgent({
          id: crypto.randomUUID(),
          name: formData.name,
          type: formData.type,
          description: formData.description,
          strategyId: formData.strategyId,
          parameters: specificParams,
          isActive: formData.isActive,
          createdAt: new Date(), 
          updatedAt: new Date()
        });
      }
      
      // Redirect back to agent dashboard
      router.push('/dashboard/agent');
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle parameter changes for the selected agent type
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
    <div className="container mx-auto p-4 space-y-6">
              <h1 className="text-3xl font-normal mb-6 text-gradient-primary">
        {agentId ? 'Configure Agent' : 'Create New Agent'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Agent Information */}
          <div className="lg:col-span-2">
            <DashboardCard title="Agent Configuration" accent="primary">
              <div className="space-y-4">
                {/* Agent Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">Agent Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Enter agent name"
                    required
                  />
                </div>
                
                {/* Agent Type */}
                <div>
                  <label className="block text-sm font-medium mb-1">Agent Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="OPTIMIZER">Portfolio Optimizer</option>
                    <option value="YIELD">Yield Harvester</option>
                    <option value="RISK_MANAGEMENT">Risk Guardian</option>
                  </select>
                </div>
                
                {/* Agent Description */}
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 h-24"
                    placeholder="Describe what this agent does"
                  />
                </div>
                
                {/* Strategy Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Strategy</label>
                  <select
                    name="strategyId"
                    value={formData.strategyId}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select a strategy</option>
                    {strategies.map(strategy => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Agent Status */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/30 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Activate agent immediately
                  </label>
                </div>
              </div>
            </DashboardCard>
          </div>
          
          {/* Agent Type-specific Configuration */}
          <div>
            <DashboardCard title="Agent Parameters" accent="secondary">
              <div className="space-y-4">
                {formData.type === 'OPTIMIZER' && (
                  <>
                    {/* Optimizer Parameters */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Optimization Interval</label>
                      <select
                        value={formData.parameters.optimizer.optimizeInterval}
                        onChange={(e) => handleParameterChange('optimizeInterval', e.target.value)}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Risk Tolerance</label>
                      <select
                        value={formData.parameters.optimizer.riskTolerance}
                        onChange={(e) => handleParameterChange('riskTolerance', e.target.value)}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="conservative">Conservative</option>
                        <option value="moderate">Moderate</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Rebalance Threshold (%)
                      </label>
                      <input
                        type="number"
                        value={formData.parameters.optimizer.rebalanceThreshold}
                        onChange={(e) => handleParameterChange('rebalanceThreshold', parseInt(e.target.value))}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                        min="1"
                        max="20"
                      />
                      <p className="text-xs text-white/60 mt-1">
                        Only rebalance when asset allocation deviates by this percentage
                      </p>
                    </div>
                  </>
                )}
                
                {formData.type === 'YIELD' && (
                  <>
                    {/* Yield Harvester Parameters */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Compound Frequency</label>
                      <select
                        value={formData.parameters.yield.compoundFrequency}
                        onChange={(e) => handleParameterChange('compoundFrequency', e.target.value)}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Gas Threshold</label>
                      <select
                        value={formData.parameters.yield.gasThreshold}
                        onChange={(e) => handleParameterChange('gasThreshold', e.target.value)}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="low">Low (Slow)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High (Fast)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Allowed Protocols</label>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="protocol-aave"
                            checked={formData.parameters.yield.protocolsAllowed.includes('aave')}
                            onChange={(e) => {
                              const protocols = e.target.checked 
                                ? [...formData.parameters.yield.protocolsAllowed, 'aave']
                                : formData.parameters.yield.protocolsAllowed.filter(p => p !== 'aave');
                              handleParameterChange('protocolsAllowed', protocols);
                            }}
                            className="w-4 h-4 mr-2"
                          />
                          <label htmlFor="protocol-aave">Aave</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="protocol-compound"
                            checked={formData.parameters.yield.protocolsAllowed.includes('compound')}
                            onChange={(e) => {
                              const protocols = e.target.checked 
                                ? [...formData.parameters.yield.protocolsAllowed, 'compound']
                                : formData.parameters.yield.protocolsAllowed.filter(p => p !== 'compound');
                              handleParameterChange('protocolsAllowed', protocols);
                            }}
                            className="w-4 h-4 mr-2"
                          />
                          <label htmlFor="protocol-compound">Compound</label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="protocol-yearn"
                            checked={formData.parameters.yield.protocolsAllowed.includes('yearn')}
                            onChange={(e) => {
                              const protocols = e.target.checked 
                                ? [...formData.parameters.yield.protocolsAllowed, 'yearn']
                                : formData.parameters.yield.protocolsAllowed.filter(p => p !== 'yearn');
                              handleParameterChange('protocolsAllowed', protocols);
                            }}
                            className="w-4 h-4 mr-2"
                          />
                          <label htmlFor="protocol-yearn">Yearn</label>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
                {formData.type === 'RISK_MANAGEMENT' && (
                  <>
                    {/* Risk Guardian Parameters */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Monitoring Interval</label>
                      <select
                        value={formData.parameters.risk.monitoringInterval}
                        onChange={(e) => handleParameterChange('monitoringInterval', e.target.value)}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="1h">Every Hour</option>
                        <option value="6h">Every 6 Hours</option>
                        <option value="12h">Every 12 Hours</option>
                        <option value="24h">Daily</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Alert Threshold</label>
                      <select
                        value={formData.parameters.risk.alertThreshold}
                        onChange={(e) => handleParameterChange('alertThreshold', e.target.value)}
                        className="w-full p-2 bg-black/20 border border-white/10 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="low">Low (More Alerts)</option>
                        <option value="medium">Medium</option>
                        <option value="high">High (Critical Alerts Only)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="autoAdjust"
                        checked={formData.parameters.risk.autoAdjust}
                        onChange={(e) => handleParameterChange('autoAdjust', e.target.checked)}
                        className="w-4 h-4 rounded border-white/30 focus:ring-primary-500"
                      />
                      <label htmlFor="autoAdjust" className="text-sm font-medium">
                        Automatically adjust portfolio
                      </label>
                    </div>
                    <p className="text-xs text-white/60">
                      If enabled, the agent will automatically make adjustments to reduce risk. Otherwise, it will only suggest changes.
                    </p>
                  </>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/agent')}
            className="px-6 py-2 border border-white/10 rounded hover:bg-white/5"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary-500/30 border border-primary-500/40 rounded hover:bg-primary-500/50"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : agentId ? 'Update Agent' : 'Create Agent'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ConfigureAgentPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ConfigureAgentForm />
    </React.Suspense>
  );
}
