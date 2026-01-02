
export interface HeaderProps {
    toggleSidebar: () => void;
}

export interface Automation {
    id: string;
    name: string;
    status: 'active' | 'paused' | 'archived';
    pnl: number;
    apy: number;
    createdAt: string;
}

export interface AutomationCardProps {
    automation: Automation;
}
