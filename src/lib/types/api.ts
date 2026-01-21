export type AgentRequest = { 
  userMessage: string;
  userWalletAddress?: string;
  agentId?: string;
  agentType?: string;
  mode?: 'research' | 'automation';
  customInstructions?: string;
  runtimeConfig?: Record<string, unknown>;
};

export type AgentResponse = { response?: string; error?: string };
