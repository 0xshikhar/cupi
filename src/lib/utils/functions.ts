// Helper function to generate mock performance data

export const portfolioData = {
    totalValue: '$29,960.00',
    dayChange: '112.52$',
    dayChangePercent: '+0.48%',
    cumulativeReturn: '27.68%',
    activeStrategies: 2
};

export const generateMockPerformanceData = (highVolatility = false) => {
    const metrics = [];
    const multiplier = highVolatility ? 2 : 1;

    for (let i = 90; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const dailyChange = (Math.random() * 2 - 0.8) * multiplier;
        const previousValue: number = i < 90 && metrics.length > 0 ? metrics[metrics.length - 1].value : 10000;
        const value: number = previousValue * (1 + dailyChange / 100);
        const cumulativeReturn: number = (value / 10000 - 1) * 100;

        metrics.push({
            id: `metric-${i}`,
            portfolioId: '1',
            date: date, // Return Date object instead of string
            value,
            percentChange: dailyChange,
            cumulativeReturn
        });
    }
    return metrics;
};

