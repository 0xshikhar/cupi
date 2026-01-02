import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AgentConfig {
    id: string;
    name: string;
    type: string;
    description?: string;
    parameters: Record<string, any>;
    strategyId?: string;
    isActive: boolean;
    lastRunAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface AgentRun {
    id: string;
    agentId: string;
    startTime: Date;
    endTime?: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: any;
    error?: string;
    actions: {
        type: string;
        timestamp: Date;
        data: any;
    }[];
}

interface AgentState {
    agents: AgentConfig[];
    selectedAgent: AgentConfig | null;
    agentRuns: Record<string, AgentRun[]>; // agentId -> runs
    isLoading: boolean;
    isProcessing: boolean;
    error: string | null;

    // Agent configuration actions
    setAgents: (agents: AgentConfig[]) => void;
    addAgent: (agent: AgentConfig) => void;
    updateAgent: (agent: AgentConfig) => void;
    deleteAgent: (agentId: string) => void;
    selectAgent: (agentId: string) => void;

    // Agent run actions
    addRun: (agentId: string, run: AgentRun) => void;
    updateRun: (agentId: string, run: AgentRun) => void;
    clearRuns: (agentId: string) => void;

    // State management
    setLoading: (loading: boolean) => void;
    setProcessing: (processing: boolean) => void;
    setError: (error: string | null) => void;
}

export const useAgentStore = create<AgentState>()(
    persist(
        (set, get) => ({
            agents: [],
            selectedAgent: null,
            agentRuns: {},
            isLoading: false,
            isProcessing: false,
            error: null,

            // Agent configuration actions
            setAgents: (agents) => set({ agents }),

            addAgent: (agent) => {
                set((state) => ({
                    agents: [...state.agents, agent]
                }));
            },

            updateAgent: (agent) => {
                set((state) => ({
                    agents: state.agents.map((a) =>
                        a.id === agent.id ? agent : a
                    ),
                    selectedAgent: state.selectedAgent?.id === agent.id
                        ? agent
                        : state.selectedAgent
                }));
            },

            deleteAgent: (agentId) => {
                set((state) => ({
                    agents: state.agents.filter((a) => a.id !== agentId),
                    selectedAgent: state.selectedAgent?.id === agentId
                        ? null
                        : state.selectedAgent
                }));
            },

            selectAgent: (agentId) => {
                set((state) => ({
                    selectedAgent: state.agents.find((a) => a.id === agentId) || null
                }));
            },

            // Agent run actions
            addRun: (agentId, run) => {
                set((state) => {
                    const agentRuns = state.agentRuns[agentId] || [];
                    return {
                        agentRuns: {
                            ...state.agentRuns,
                            [agentId]: [run, ...agentRuns]
                        }
                    };
                });
            },

            updateRun: (agentId, run) => {
                set((state) => {
                    const agentRuns = state.agentRuns[agentId] || [];
                    return {
                        agentRuns: {
                            ...state.agentRuns,
                            [agentId]: agentRuns.map((r) =>
                                r.id === run.id ? run : r
                            )
                        }
                    };
                });
            },

            clearRuns: (agentId) => {
                set((state) => {
                    const { [agentId]: _, ...remainingRuns } = state.agentRuns;
                    return { agentRuns: remainingRuns };
                });
            },

            // State management
            setLoading: (loading) => set({ isLoading: loading }),
            setProcessing: (processing) => set({ isProcessing: processing }),
            setError: (error) => set({ error }),
        }),
        {
            name: 'stratifi-agent-storage',
            partialize: (state) => ({
                agents: state.agents,
                selectedAgent: state.selectedAgent
            }),
        }
    )
);
