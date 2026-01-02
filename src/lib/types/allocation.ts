export interface AllocationState {
    riskProfile?: any;
    step: "INITIAL" | "AWAITING_BUDGET" | "COMPLETE";
    sessionId: string;
}

export interface RiskQuestion {
    id: number;
    question: string;
    options: Array<{
        value: string;
        text: string;
        points: number;
    }>;
}

export interface DefiAllocationWizardProps {
    userWalletAddress?: string;
    chainId?: string;
}