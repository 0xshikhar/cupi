import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Asset {
  id: string;
  portfolioId: string;
  name: string;
  symbol: string;
  type: string;
  amount: number;
  currentPrice?: number;
  chainId?: number;
  contractAddress?: string;
  lastUpdatedAt?: Date;
  transactions?: Transaction[];
}

interface Strategy {
  id: string;
  portfolioId: string;
  name: string;
  description?: string;
  targetAllocation?: number;
  riskLevel?: string;
  isActive: boolean;
  agent?: Agent;
}

interface Agent {
  id: string;
  strategyId: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
  isActive: boolean;
  lastRunAt?: Date;
}

export interface Transaction {
  id: string;
  assetId: string;
  amount: number;
  price?: number;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'SWAP' | 'YIELD_FARMING' | 'STAKING';
  timestamp: Date;
  status: string;
  hash?: string;
  agentId?: string;
}

interface PerformanceMetric {
  id: string;
  portfolioId: string;
  date: Date;
  value: number;
  percentChange: number;
  cumulativeReturn: number;
}

export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isActive: boolean;
  assets: Asset[];
  strategies: Strategy[];
  performanceMetrics?: PerformanceMetric[];
  createdAt: Date;
  updatedAt: Date;
}

interface PortfolioState {
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  isLoading: boolean;
  error: string | null;
  setPortfolios: (_portfolios: Portfolio[]) => void;
  addPortfolio: (_portfolio: Portfolio) => void;
  updatePortfolio: (_portfolio: Portfolio) => void;
  deletePortfolio: (_portfolioId: string) => void;
  selectPortfolio: (_portfolioId: string) => void;
  setLoading: (_loading: boolean) => void;
  setError: (_error: string | null) => void;
  // Asset operations
  addAsset: (_portfolioId: string, _asset: Asset) => void;
  updateAsset: (_portfolioId: string, _asset: Asset) => void;
  deleteAsset: (_portfolioId: string, _assetId: string) => void;
  // Strategy operations
  addStrategy: (_portfolioId: string, _strategy: Strategy) => void;
  updateStrategy: (_portfolioId: string, _strategy: Strategy) => void;
  deleteStrategy: (_portfolioId: string, _strategyId: string) => void;
  // Transaction operations
  addTransaction: (_portfolioId: string, _assetId: string, _transaction: Transaction) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      portfolios: [],
      selectedPortfolio: null,
      isLoading: false,
      error: null,

      setPortfolios: (_portfolios) => set({ portfolios: _portfolios }),

      addPortfolio: (_portfolio) => {
        set((state) => ({
          portfolios: [...state.portfolios, _portfolio],
        }));
      },

      updatePortfolio: (_portfolio) => {
        set((state) => ({
          portfolios: state.portfolios.map((p) => (p.id === _portfolio.id ? _portfolio : p)),
          selectedPortfolio:
            state.selectedPortfolio?.id === _portfolio.id ? _portfolio : state.selectedPortfolio,
        }));
      },

      deletePortfolio: (_portfolioId) => {
        set((state) => ({
          portfolios: state.portfolios.filter((p) => p.id !== _portfolioId),
          selectedPortfolio:
            state.selectedPortfolio?.id === _portfolioId ? null : state.selectedPortfolio,
        }));
      },

      selectPortfolio: (_portfolioId) => {
        set((state) => ({
          selectedPortfolio: state.portfolios.find((p) => p.id === _portfolioId) || null,
        }));
      },

      setLoading: (_loading) => set({ isLoading: _loading }),
      setError: (_error) => set({ error: _error }),

      addAsset: (_portfolioId, _asset) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((portfolio) => {
            if (portfolio.id === _portfolioId) {
              return {
                ...portfolio,
                assets: [...portfolio.assets, _asset],
              };
            }
            return portfolio;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio?.id === _portfolioId && state.selectedPortfolio
              ? {
                  ...state.selectedPortfolio,
                  assets: [...state.selectedPortfolio.assets, _asset],
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },

      updateAsset: (_portfolioId, _asset) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((portfolio) => {
            if (portfolio.id === _portfolioId) {
              return {
                ...portfolio,
                assets: portfolio.assets.map((a) => (a.id === _asset.id ? _asset : a)),
              };
            }
            return portfolio;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio?.id === _portfolioId && state.selectedPortfolio
              ? {
                  ...state.selectedPortfolio,
                  assets: state.selectedPortfolio.assets.map((a) =>
                    a.id === _asset.id ? _asset : a
                  ),
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },

      deleteAsset: (_portfolioId, _assetId) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((portfolio) => {
            if (portfolio.id === _portfolioId) {
              return {
                ...portfolio,
                assets: portfolio.assets.filter((a) => a.id !== _assetId),
              };
            }
            return portfolio;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio?.id === _portfolioId && state.selectedPortfolio
              ? {
                  ...state.selectedPortfolio,
                  assets: state.selectedPortfolio.assets.filter((a) => a.id !== _assetId),
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },

      addStrategy: (_portfolioId, _strategy) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((portfolio) => {
            if (portfolio.id === _portfolioId) {
              return {
                ...portfolio,
                strategies: [...portfolio.strategies, _strategy],
              };
            }
            return portfolio;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio?.id === _portfolioId && state.selectedPortfolio
              ? {
                  ...state.selectedPortfolio,
                  strategies: [...state.selectedPortfolio.strategies, _strategy],
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },

      updateStrategy: (_portfolioId, _strategy) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((portfolio) => {
            if (portfolio.id === _portfolioId) {
              return {
                ...portfolio,
                strategies: portfolio.strategies.map((s) =>
                  s.id === _strategy.id ? _strategy : s
                ),
              };
            }
            return portfolio;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio?.id === _portfolioId && state.selectedPortfolio
              ? {
                  ...state.selectedPortfolio,
                  strategies: state.selectedPortfolio.strategies.map((s) =>
                    s.id === _strategy.id ? _strategy : s
                  ),
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },

      deleteStrategy: (_portfolioId, _strategyId) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((portfolio) => {
            if (portfolio.id === _portfolioId) {
              return {
                ...portfolio,
                strategies: portfolio.strategies.filter((s) => s.id !== _strategyId),
              };
            }
            return portfolio;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio?.id === _portfolioId && state.selectedPortfolio
              ? {
                  ...state.selectedPortfolio,
                  strategies: state.selectedPortfolio.strategies.filter(
                    (s) => s.id !== _strategyId
                  ),
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },

      addTransaction: (_portfolioId, _assetId, _transaction) => {
        set((state) => {
          const updatedPortfolios = state.portfolios.map((p) => {
            const asset = p.assets.find((a) => a.id === _assetId);
            if (asset) {
              const updatedAsset = {
                ...asset,
                transactions: [...(asset.transactions || []), _transaction],
              };
              return {
                ...p,
                assets: p.assets.map((a) => (a.id === _assetId ? updatedAsset : a)),
              };
            }
            return p;
          });

          const updatedSelectedPortfolio =
            state.selectedPortfolio && state.selectedPortfolio.assets.find((a) => a.id === _assetId)
              ? {
                  ...state.selectedPortfolio,
                  assets: state.selectedPortfolio.assets.map((a) => {
                    if (a.id === _assetId) {
                      return {
                        ...a,
                        transactions: [...(a.transactions || []), _transaction],
                      };
                    }
                    return a;
                  }),
                }
              : state.selectedPortfolio;

          return {
            portfolios: updatedPortfolios,
            selectedPortfolio: updatedSelectedPortfolio,
          };
        });
      },
    }),
    {
      name: 'portfolio-storage',
    }
  )
);
