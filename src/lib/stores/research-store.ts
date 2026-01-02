import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Protocol {
  id: string;
  name: string;
  category: string;
  riskScore: number;
  apy: number;
  tvl: number;
  description?: string;
  url?: string;
  chainId: number;
  chainName: string;
  audited: boolean;
  logoUrl?: string;
}

interface RiskAssessment {
  id: string;
  protocolId: string;
  score: number;
  factors: {
    auditScore: number;
    tvlScore: number;
    ageScore: number;
    communityScore: number;
    codeQualityScore: number;
  };
  analysis: string;
  date: Date;
}

interface ProtocolComparison {
  protocols: Protocol[];
  metrics: string[];
  date: Date;
}

interface ResearchState {
  protocols: Protocol[];
  favoriteProtocols: string[]; // Array of protocol IDs
  riskAssessments: Record<string, RiskAssessment>; // protocolId -> RiskAssessment
  recentComparisons: ProtocolComparison[];
  filters: {
    categories: string[];
    chains: number[];
    minRiskScore: number;
    maxRiskScore: number;
    minAPY: number;
    auditedOnly: boolean;
  };
  isLoading: boolean;
  error: string | null;
  
  // Protocol actions
  setProtocols: (protocols: Protocol[]) => void;
  addProtocol: (protocol: Protocol) => void;
  updateProtocol: (protocol: Protocol) => void;
  toggleFavorite: (protocolId: string) => void;
  
  // Risk assessment actions
  addRiskAssessment: (assessment: RiskAssessment) => void;
  updateRiskAssessment: (assessment: RiskAssessment) => void;
  
  // Comparison actions
  addComparison: (comparison: ProtocolComparison) => void;
  
  // Filter actions
  updateFilters: (filters: Partial<ResearchState['filters']>) => void;
  resetFilters: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Default filters
const defaultFilters = {
  categories: [],
  chains: [],
  minRiskScore: 0,
  maxRiskScore: 10,
  minAPY: 0,
  auditedOnly: false,
};

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      protocols: [],
      favoriteProtocols: [],
      riskAssessments: {},
      recentComparisons: [],
      filters: { ...defaultFilters },
      isLoading: false,
      error: null,
      
      // Protocol actions
      setProtocols: (protocols) => set({ protocols }),
      
      addProtocol: (protocol) => {
        set((state) => ({
          protocols: [...state.protocols, protocol]
        }));
      },
      
      updateProtocol: (protocol) => {
        set((state) => ({
          protocols: state.protocols.map((p) => 
            p.id === protocol.id ? protocol : p
          )
        }));
      },
      
      toggleFavorite: (protocolId) => {
        set((state) => {
          const isFavorite = state.favoriteProtocols.includes(protocolId);
          return {
            favoriteProtocols: isFavorite
              ? state.favoriteProtocols.filter((id) => id !== protocolId)
              : [...state.favoriteProtocols, protocolId]
          };
        });
      },
      
      // Risk assessment actions
      addRiskAssessment: (assessment) => {
        set((state) => ({
          riskAssessments: {
            ...state.riskAssessments,
            [assessment.protocolId]: assessment
          }
        }));
      },
      
      updateRiskAssessment: (assessment) => {
        set((state) => ({
          riskAssessments: {
            ...state.riskAssessments,
            [assessment.protocolId]: assessment
          }
        }));
      },
      
      // Comparison actions
      addComparison: (comparison) => {
        set((state) => ({
          recentComparisons: [
            comparison,
            ...state.recentComparisons.slice(0, 9) // Keep only 10 most recent
          ]
        }));
      },
      
      // Filter actions
      updateFilters: (filters) => {
        set((state) => ({
          filters: {
            ...state.filters,
            ...filters
          }
        }));
      },
      
      resetFilters: () => {
        set({ filters: { ...defaultFilters } });
      },
      
      // State management
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'stratifi-research-storage',
      partialize: (state) => ({
        favoriteProtocols: state.favoriteProtocols,
        filters: state.filters,
        recentComparisons: state.recentComparisons
      }),
    }
  )
);
