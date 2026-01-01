import fs from 'fs';
import path from 'path';

// Type definitions for the vault configuration
export interface VaultConfig {
  version: string;
  lastUpdated: string;
  description: string;
  chains: Record<string, ChainConfig>;
  selectionCriteria: Record<string, SelectionCriteria>;
  rebalancing: RebalancingConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  metadata: MetadataConfig;
}

export interface ChainConfig {
  name: string;
  shortName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  tokens: Record<string, TokenConfig>;
}

export interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  category: string;
  riskLevel: number;
  vaults: VaultInfo[];
}

export interface VaultInfo {
  address: string;
  name: string;
  symbol: string;
  description: string;
  isWhitelisted: boolean;
  isActive: boolean;
  minTvl: number;
  riskScore: number;
  category: string;
  curator: string;
  fee: number;
  maxAllocation: number;
  tags: string[];
}

export interface SelectionCriteria {
  minTvlUsd: number;
  minApyPercent: number;
  maxRiskScore: number;
  requireWhitelisted: boolean;
  maxVaultAllocation: number;
  preferredVaultCount: number;
  maxVaultCount: number;
  minInvestmentUsd: number;
  rebalanceThreshold: number;
}

export interface RebalancingConfig {
  schedule: {
    frequency: string;
    time: string;
    timezone: string;
    enabled: boolean;
  };
  triggers: {
    performanceDrift: number;
    allocationDrift: number;
    newBestVault: boolean;
    vaultDeactivation: boolean;
  };
  constraints: {
    minRebalanceAmount: number;
    maxGasPrice: number;
    maxSlippage: number;
    cooldownPeriod: number;
  };
}

export interface MonitoringConfig {
  healthChecks: {
    vaultAvailability: boolean;
    priceFeeds: boolean;
    gasPrice: boolean;
    networkConnectivity: boolean;
  };
  alerts: {
    vaultDeactivation: boolean;
    highGasPrice: boolean;
    investmentFailure: boolean;
    rebalanceFailure: boolean;
    lowTvl: boolean;
  };
  thresholds: {
    maxGasPrice: number;
    minTvlAlert: number;
    maxFailureRate: number;
  };
}

export interface SecurityConfig {
  maxDailyInvestment: number;
  maxUserInvestment: number;
  emergencyPause: boolean;
  adminAddresses: string[];
  pauseReasons: string[];
  lastSecurityReview: string;
}

export interface MetadataConfig {
  configVersion: string;
  schemaVersion: string;
  maintainer: string;
  lastAudit: string;
  nextReview: string;
  changelog: {
    version: string;
    date: string;
    changes: string[];
  }[];
}

// Vault configuration loader class
export class VaultConfigLoader {
  private static instance: VaultConfigLoader;
  private config: VaultConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'morpho-vaults.json');
  }

  public static getInstance(): VaultConfigLoader {
    if (!VaultConfigLoader.instance) {
      VaultConfigLoader.instance = new VaultConfigLoader();
    }
    return VaultConfigLoader.instance;
  }

  /**
   * Load the vault configuration from JSON file
   */
  public async loadConfig(): Promise<VaultConfig> {
    try {
      if (!this.config) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData) as VaultConfig;
        this.validateConfig(this.config);
      }
      return this.config;
    } catch (error) {
      console.error('Failed to load vault configuration:', error);
      throw new Error(`Failed to load vault configuration: ${error}`);
    }
  }

  /**
   * Reload configuration from file (useful for updates)
   */
  public async reloadConfig(): Promise<VaultConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Get vaults for a specific chain and token
   */
  public async getVaultsForToken(chainId: string, tokenSymbol: string): Promise<VaultInfo[]> {
    const config = await this.loadConfig();
    const chain = config.chains[chainId];
    
    if (!chain) {
      throw new Error(`Chain ${chainId} not found in configuration`);
    }

    const token = chain.tokens[tokenSymbol];
    if (!token) {
      throw new Error(`Token ${tokenSymbol} not found for chain ${chainId}`);
    }

    return token.vaults.filter(vault => vault.isActive);
  }

  /**
   * Get selection criteria for a risk profile
   */
  public async getSelectionCriteria(riskProfile: string = 'default'): Promise<SelectionCriteria> {
    const config = await this.loadConfig();
    const criteria = config.selectionCriteria[riskProfile];
    
    if (!criteria) {
      console.warn(`Risk profile ${riskProfile} not found, using default`);
      return config.selectionCriteria.default;
    }

    return criteria;
  }

  /**
   * Get all supported chains
   */
  public async getSupportedChains(): Promise<Record<string, ChainConfig>> {
    const config = await this.loadConfig();
    return config.chains;
  }

  /**
   * Get all supported tokens for a chain
   */
  public async getSupportedTokens(chainId: string): Promise<Record<string, TokenConfig>> {
    const config = await this.loadConfig();
    const chain = config.chains[chainId];
    
    if (!chain) {
      throw new Error(`Chain ${chainId} not found in configuration`);
    }

    return chain.tokens;
  }

  /**
   * Check if emergency pause is active
   */
  public async isEmergencyPaused(): Promise<boolean> {
    const config = await this.loadConfig();
    return config.security.emergencyPause;
  }

  /**
   * Get rebalancing configuration
   */
  public async getRebalancingConfig(): Promise<RebalancingConfig> {
    const config = await this.loadConfig();
    return config.rebalancing;
  }

  /**
   * Get monitoring configuration
   */
  public async getMonitoringConfig(): Promise<MonitoringConfig> {
    const config = await this.loadConfig();
    return config.monitoring;
  }

  /**
   * Filter vaults by selection criteria
   */
  public filterVaultsByCriteria(
    vaults: VaultInfo[],
    criteria: SelectionCriteria,
    vaultMetrics?: Record<string, { apy: number; tvlUsd: number }>
  ): VaultInfo[] {
    return vaults.filter(vault => {
      // Check whitelist requirement
      if (criteria.requireWhitelisted && !vault.isWhitelisted) {
        return false;
      }

      // Check risk score
      if (vault.riskScore > criteria.maxRiskScore) {
        return false;
      }

      // Check minimum TVL
      if (vault.minTvl < criteria.minTvlUsd) {
        return false;
      }

      // Check vault metrics if provided
      if (vaultMetrics && vaultMetrics[vault.address]) {
        const metrics = vaultMetrics[vault.address];
        
        // Check minimum APY
        if (metrics.apy < criteria.minApyPercent) {
          return false;
        }

        // Check actual TVL
        if (metrics.tvlUsd < criteria.minTvlUsd) {
          return false;
        }
      }

      return vault.isActive;
    });
  }

  /**
   * Sort vaults by preference (APY, risk-adjusted returns, etc.)
   */
  public sortVaultsByPreference(
    vaults: VaultInfo[],
    vaultMetrics?: Record<string, { apy: number; tvlUsd: number; riskAdjustedReturn?: number }>
  ): VaultInfo[] {
    return vaults.sort((a, b) => {
      if (!vaultMetrics) {
        // Fallback to risk score and fee sorting
        const riskDiff = a.riskScore - b.riskScore;
        if (riskDiff !== 0) return riskDiff;
        return a.fee - b.fee;
      }

      const metricsA = vaultMetrics[a.address];
      const metricsB = vaultMetrics[b.address];

      if (!metricsA && !metricsB) return 0;
      if (!metricsA) return 1;
      if (!metricsB) return -1;

      // Sort by risk-adjusted return if available, otherwise by APY
      const scoreA = metricsA.riskAdjustedReturn || metricsA.apy / (a.riskScore || 1);
      const scoreB = metricsB.riskAdjustedReturn || metricsB.apy / (b.riskScore || 1);

      return scoreB - scoreA; // Descending order (best first)
    });
  }

  /**
   * Calculate optimal allocation across vaults
   */
  public calculateOptimalAllocation(
    vaults: VaultInfo[],
    totalAmount: number,
    criteria: SelectionCriteria
  ): { vault: VaultInfo; allocation: number; amount: number }[] {
    const selectedVaults = vaults.slice(0, criteria.preferredVaultCount);
    const allocations: { vault: VaultInfo; allocation: number; amount: number }[] = [];

    if (selectedVaults.length === 0) {
      return allocations;
    }

    // Simple equal weight allocation with max allocation constraints
    const baseAllocation = 1 / selectedVaults.length;
    let remainingAllocation = 1;
    const remainingVaults = [...selectedVaults];

    // First pass: apply max allocation constraints
    for (const vault of selectedVaults) {
      const maxAllowed = Math.min(vault.maxAllocation, criteria.maxVaultAllocation);
      const allocation = Math.min(baseAllocation, maxAllowed);
      
      allocations.push({
        vault,
        allocation,
        amount: totalAmount * allocation
      });

      remainingAllocation -= allocation;
    }

    // Second pass: redistribute remaining allocation
    if (remainingAllocation > 0.001) { // Small threshold for floating point precision
      const redistributePerVault = remainingAllocation / allocations.length;
      
      for (const allocation of allocations) {
        const maxAllowed = Math.min(
          allocation.vault.maxAllocation,
          criteria.maxVaultAllocation
        );
        const additionalAllocation = Math.min(
          redistributePerVault,
          maxAllowed - allocation.allocation
        );
        
        allocation.allocation += additionalAllocation;
        allocation.amount = totalAmount * allocation.allocation;
      }
    }

    return allocations.filter(a => a.amount >= criteria.minInvestmentUsd);
  }

  /**
   * Validate configuration structure and data
   */
  private validateConfig(config: VaultConfig): void {
    if (!config.version) {
      throw new Error('Configuration version is required');
    }

    if (!config.chains || Object.keys(config.chains).length === 0) {
      throw new Error('At least one chain configuration is required');
    }

    if (!config.selectionCriteria || !config.selectionCriteria.default) {
      throw new Error('Default selection criteria is required');
    }

    // Validate each chain configuration
    for (const [chainId, chainConfig] of Object.entries(config.chains)) {
      if (!chainConfig.name || !chainConfig.rpcUrl) {
        throw new Error(`Invalid configuration for chain ${chainId}`);
      }

      if (!chainConfig.tokens || Object.keys(chainConfig.tokens).length === 0) {
        console.warn(`No tokens configured for chain ${chainId}`);
      }

      // Validate vault addresses
      for (const [tokenSymbol, tokenConfig] of Object.entries(chainConfig.tokens)) {
        for (const vault of tokenConfig.vaults) {
          if (!vault.address || !vault.address.startsWith('0x')) {
            throw new Error(`Invalid vault address for ${tokenSymbol} on chain ${chainId}`);
          }
        }
      }
    }

    console.log(`✅ Vault configuration validated successfully (version ${config.version})`);
  }
}

// Export singleton instance
export const vaultConfigLoader = VaultConfigLoader.getInstance();

// Utility functions
export const getVaultConfig = () => vaultConfigLoader.loadConfig();
export const getVaultsForToken = (chainId: string, tokenSymbol: string) => 
  vaultConfigLoader.getVaultsForToken(chainId, tokenSymbol);
export const getSelectionCriteria = (riskProfile?: string) => 
  vaultConfigLoader.getSelectionCriteria(riskProfile);