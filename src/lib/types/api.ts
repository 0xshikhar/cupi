export type AgentRequest = { 
  userMessage: string;
  agentType?: string;
  mode?: 'research' | 'automation';
};

export type AgentResponse = { response?: string; error?: string };
