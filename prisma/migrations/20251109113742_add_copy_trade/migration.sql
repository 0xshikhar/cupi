-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 50,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenAddress" TEXT,
    "chain" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "costBasis" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPriceUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performance1d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performance7d" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performance30d" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "expectedReturn" DOUBLE PRECISION,
    "timeHorizon" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "strategyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "configuration" JSONB NOT NULL,
    "performanceScore" DOUBLE PRECISION,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "assetId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "hash" TEXT,
    "chain" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Research" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "sentiment" TEXT,
    "relatedAssets" TEXT[],

    CONSTRAINT "Research_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "change" DOUBLE PRECISION NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recommendation" TEXT,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWalletMap" (
    "agent_id" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWalletMap_pkey" PRIMARY KEY ("agent_id")
);

-- CreateTable
CREATE TABLE "AgentWallet" (
    "agent_id" TEXT NOT NULL,
    "walletPrivateKey" TEXT NOT NULL,
    "walletPublicKey" TEXT NOT NULL,
    "smartWalletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWallet_pkey" PRIMARY KEY ("agent_id")
);

-- CreateTable
CREATE TABLE "AgentSession" (
    "session_id" TEXT NOT NULL,
    "agent_scratchpad" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userWalletAddress" TEXT NOT NULL,
    "risk_profile" TEXT NOT NULL DEFAULT '',
    "other_user_info" TEXT NOT NULL DEFAULT '',
    "basicWalletId" TEXT,
    "proWalletId" TEXT,
    "basicWalletAddress" TEXT,
    "proWalletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userWalletAddress")
);

-- CreateTable
CREATE TABLE "BasicAgentWallet" (
    "id" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,
    "agentWalletAddress" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "encryptionSalt" TEXT NOT NULL,
    "walletType" TEXT NOT NULL DEFAULT 'basic',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "BasicAgentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletUsageStats" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "walletType" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "totalGasUsed" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalVolumeUsd" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "lastTransactionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletUsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MorphoVault" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL,
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "riskScore" INTEGER NOT NULL DEFAULT 50,
    "description" TEXT,
    "curatorName" TEXT,
    "curatorImage" TEXT,
    "forumLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MorphoVault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultMetric" (
    "id" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apy" DOUBLE PRECISION NOT NULL,
    "netApy" DOUBLE PRECISION NOT NULL,
    "netApyWithoutRewards" DOUBLE PRECISION,
    "dailyApy" DOUBLE PRECISION,
    "dailyNetApy" DOUBLE PRECISION,
    "weeklyApy" DOUBLE PRECISION,
    "weeklyNetApy" DOUBLE PRECISION,
    "monthlyApy" DOUBLE PRECISION,
    "monthlyNetApy" DOUBLE PRECISION,
    "totalAssets" TEXT NOT NULL,
    "totalAssetsUsd" DOUBLE PRECISION NOT NULL,
    "totalSupply" TEXT NOT NULL,
    "sharePrice" DOUBLE PRECISION NOT NULL,
    "sharePriceUsd" DOUBLE PRECISION NOT NULL,
    "tvlUsd" DOUBLE PRECISION NOT NULL,
    "utilizationRate" DOUBLE PRECISION,
    "supplyAssets" TEXT,
    "supplyAssetsUsd" DOUBLE PRECISION,
    "borrowAssets" TEXT,
    "borrowAssetsUsd" DOUBLE PRECISION,
    "fee" DOUBLE PRECISION,
    "performanceScore" DOUBLE PRECISION,
    "riskAdjustedReturn" DOUBLE PRECISION,
    "volatility" DOUBLE PRECISION,
    "sharpeRatio" DOUBLE PRECISION,
    "marketCount" INTEGER,
    "avgMarketUtilization" DOUBLE PRECISION,

    CONSTRAINT "VaultMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvestment" (
    "id" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,
    "vaultId" TEXT NOT NULL,
    "amountInvested" TEXT NOT NULL,
    "sharesReceived" TEXT NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "currentShares" TEXT NOT NULL,
    "averageEntryPrice" DOUBLE PRECISION NOT NULL,
    "totalDeposits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithdrawals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unrealizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "firstInvestmentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTransactionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInvestment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebalanceJob" (
    "id" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobType" TEXT NOT NULL DEFAULT 'daily',
    "fromVaults" JSONB NOT NULL,
    "toVaults" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "gasUsed" TEXT,
    "transactionHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RebalanceJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultReward" (
    "id" TEXT NOT NULL,
    "vaultMetricId" TEXT NOT NULL,
    "assetAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "supplyApr" DOUBLE PRECISION NOT NULL,
    "borrowApr" DOUBLE PRECISION,
    "yearlySupplyTokens" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAllocation" (
    "id" TEXT NOT NULL,
    "vaultMetricId" TEXT NOT NULL,
    "marketUniqueKey" TEXT NOT NULL,
    "supplyAssets" DOUBLE PRECISION NOT NULL,
    "supplyAssetsUsd" DOUBLE PRECISION NOT NULL,
    "borrowAssets" DOUBLE PRECISION,
    "borrowAssetsUsd" DOUBLE PRECISION,
    "utilizationRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyTradeRule" (
    "id" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sources" JSONB NOT NULL,
    "condition" JSONB NOT NULL,
    "buySpec" JSONB NOT NULL,
    "sellSpec" JSONB,
    "riskGuardrails" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopyTradeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirroredPosition" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "openQty" TEXT NOT NULL,
    "avgEntryPriceUSD" DOUBLE PRECISION NOT NULL,
    "lastTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MirroredPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceMetric_entityId_entityType_date_key" ON "PerformanceMetric"("entityId", "entityType", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWalletMap_agent_id_key" ON "AgentWalletMap"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWalletMap_userWalletAddress_key" ON "AgentWalletMap"("userWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWallet_agent_id_key" ON "AgentWallet"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSession_session_id_key" ON "AgentSession"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userWalletAddress_key" ON "UserProfile"("userWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "BasicAgentWallet_userWalletAddress_key" ON "BasicAgentWallet"("userWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "BasicAgentWallet_agentWalletAddress_key" ON "BasicAgentWallet"("agentWalletAddress");

-- CreateIndex
CREATE INDEX "BasicAgentWallet_userWalletAddress_idx" ON "BasicAgentWallet"("userWalletAddress");

-- CreateIndex
CREATE INDEX "BasicAgentWallet_agentWalletAddress_idx" ON "BasicAgentWallet"("agentWalletAddress");

-- CreateIndex
CREATE INDEX "BasicAgentWallet_status_idx" ON "BasicAgentWallet"("status");

-- CreateIndex
CREATE INDEX "WalletUsageStats_walletId_idx" ON "WalletUsageStats"("walletId");

-- CreateIndex
CREATE INDEX "WalletUsageStats_walletType_idx" ON "WalletUsageStats"("walletType");

-- CreateIndex
CREATE UNIQUE INDEX "MorphoVault_address_key" ON "MorphoVault"("address");

-- CreateIndex
CREATE INDEX "MorphoVault_chainId_idx" ON "MorphoVault"("chainId");

-- CreateIndex
CREATE INDEX "MorphoVault_tokenAddress_idx" ON "MorphoVault"("tokenAddress");

-- CreateIndex
CREATE INDEX "MorphoVault_isWhitelisted_idx" ON "MorphoVault"("isWhitelisted");

-- CreateIndex
CREATE INDEX "MorphoVault_riskScore_idx" ON "MorphoVault"("riskScore");

-- CreateIndex
CREATE UNIQUE INDEX "MorphoVault_address_chainId_key" ON "MorphoVault"("address", "chainId");

-- CreateIndex
CREATE INDEX "VaultMetric_vaultId_idx" ON "VaultMetric"("vaultId");

-- CreateIndex
CREATE INDEX "VaultMetric_date_idx" ON "VaultMetric"("date");

-- CreateIndex
CREATE INDEX "VaultMetric_apy_idx" ON "VaultMetric"("apy");

-- CreateIndex
CREATE INDEX "VaultMetric_tvlUsd_idx" ON "VaultMetric"("tvlUsd");

-- CreateIndex
CREATE INDEX "VaultMetric_performanceScore_idx" ON "VaultMetric"("performanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "VaultMetric_vaultId_date_key" ON "VaultMetric"("vaultId", "date");

-- CreateIndex
CREATE INDEX "UserInvestment_userWalletAddress_idx" ON "UserInvestment"("userWalletAddress");

-- CreateIndex
CREATE INDEX "UserInvestment_vaultId_idx" ON "UserInvestment"("vaultId");

-- CreateIndex
CREATE INDEX "UserInvestment_status_idx" ON "UserInvestment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvestment_userWalletAddress_vaultId_key" ON "UserInvestment"("userWalletAddress", "vaultId");

-- CreateIndex
CREATE INDEX "RebalanceJob_userWalletAddress_idx" ON "RebalanceJob"("userWalletAddress");

-- CreateIndex
CREATE INDEX "RebalanceJob_scheduledAt_idx" ON "RebalanceJob"("scheduledAt");

-- CreateIndex
CREATE INDEX "RebalanceJob_status_idx" ON "RebalanceJob"("status");

-- CreateIndex
CREATE INDEX "RebalanceJob_jobType_idx" ON "RebalanceJob"("jobType");

-- CreateIndex
CREATE INDEX "VaultReward_vaultMetricId_idx" ON "VaultReward"("vaultMetricId");

-- CreateIndex
CREATE INDEX "VaultReward_assetAddress_chainId_idx" ON "VaultReward"("assetAddress", "chainId");

-- CreateIndex
CREATE INDEX "VaultAllocation_vaultMetricId_idx" ON "VaultAllocation"("vaultMetricId");

-- CreateIndex
CREATE INDEX "VaultAllocation_marketUniqueKey_idx" ON "VaultAllocation"("marketUniqueKey");

-- CreateIndex
CREATE INDEX "CopyTradeRule_userWalletAddress_idx" ON "CopyTradeRule"("userWalletAddress");

-- CreateIndex
CREATE INDEX "CopyTradeRule_status_idx" ON "CopyTradeRule"("status");

-- CreateIndex
CREATE INDEX "RuleEvent_ruleId_idx" ON "RuleEvent"("ruleId");

-- CreateIndex
CREATE INDEX "RuleEvent_type_idx" ON "RuleEvent"("type");

-- CreateIndex
CREATE INDEX "MirroredPosition_tokenAddress_idx" ON "MirroredPosition"("tokenAddress");

-- CreateIndex
CREATE UNIQUE INDEX "MirroredPosition_ruleId_tokenAddress_key" ON "MirroredPosition"("ruleId", "tokenAddress");

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultMetric" ADD CONSTRAINT "VaultMetric_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "MorphoVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInvestment" ADD CONSTRAINT "UserInvestment_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "MorphoVault"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultReward" ADD CONSTRAINT "VaultReward_vaultMetricId_fkey" FOREIGN KEY ("vaultMetricId") REFERENCES "VaultMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAllocation" ADD CONSTRAINT "VaultAllocation_vaultMetricId_fkey" FOREIGN KEY ("vaultMetricId") REFERENCES "VaultMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleEvent" ADD CONSTRAINT "RuleEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CopyTradeRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirroredPosition" ADD CONSTRAINT "MirroredPosition_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CopyTradeRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
