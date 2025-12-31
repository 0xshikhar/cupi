import { Protocol } from "../stores/research-store";

export interface Recommendation {
    id: string;
    type: 'diversification' | 'yield' | 'risk' | 'trending' | 'crosschain';
    title: string;
    description: string;
    protocols: Protocol[];
    impact: 'high' | 'medium' | 'low';
    reasoning: string;
}

// Type definitions for chart data
export interface TvlData {
    labels: string[];
    data: number[];
}

export interface ApyTrend {
    name: string;
    data: number[];
}

export interface ApyTrends {
    labels: string[];
    datasets: ApyTrend[];
}

export interface RiskMatrix {
    categories: string[];
    risk: number[];
    reward: number[];
}

export interface MarketData {
    tvlData: TvlData;
    apyTrends: ApyTrends;
    riskMatrix: RiskMatrix;
}

export interface MarketInsight {
    id: number;
    title: string;
    category: string;
    analysis: string;
    date: string;
    confidence: number;
}

export type TopProtocols = {
    [category: string]: Protocol;
};

export interface RiskAssessmentData {
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
    date: string;
}   

export interface RiskFactorBarProps {
    name: string;
    score: number;
    description?: string;
}   