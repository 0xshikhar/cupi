export interface TradingGroup {
	id: string
	name: string
	groupId: number
	owner: string
	ownerAddress: string
	avatar?: string
	trades: number
	roi: number
	pnl: string
	winRate: number
	scamRate: number
	usersWinRate: number
	totalUsers: number
	createdAt: string
	isVerified?: boolean
}

export interface Trader {
	id: string
	name: string
	address: string
	avatar?: string
	trades: number
	roi: number
	pnl: string
	winRate: number
	scamRate: number
	usersWinRate: number
	totalFollowers: number
	createdAt: string
	isVerified?: boolean
}

export interface CopyTradingFilters {
	timeframe: '7D' | '30D' | '90D' | 'ALL'
	sortBy: 'roi' | 'pnl' | 'winRate' | 'usersWinRate' | 'trades'
	minWinRate?: number
	maxScamRate?: number
}

export interface CopyTradingStats {
	totalGroups: number
	totalTraders: number
	totalCopies: number
	averageROI: number
}

