import { useState, useEffect, useCallback } from 'react';
import { useAuthWallet } from '@/lib/hooks/useAuthWallet';
import { getUserNotifications } from '@/app/actions/user';

export interface ActivityItem {
    id: string;
    type: 'NOTIFICATION' | 'TRANSACTION';
    source: 'SYSTEM' | 'APP' | 'CHAIN';

    // Display Data
    title: string;
    subtitle: string;
    timestamp: number; // Unix timestamp in milliseconds

    // Transaction Data (Optional)
    amount?: string;
    currency?: string;
    isIncoming?: boolean;
    status?: 'success' | 'pending' | 'failed';
    hash?: string;
    chainId?: number;
    chainName?: string;

    // Notification Data (Optional)
    notificationType?: string;
}

export function useActivityFeed() {
    const { userWalletAddress, basicWalletAddress } = useAuthWallet();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllActivity = useCallback(async () => {
        if (!userWalletAddress || !basicWalletAddress) return;

        try {
            setIsLoading(true);
            console.log('[ACTIVITY HOOK] Fetching all activity...');

            // 1. Fetch System Notifications (Linked to User)
            const notificationsPromise = getUserNotifications(userWalletAddress);

            // 2. Fetch App Transactions (Prisma)
            // IMPORTANT: We pass basicWalletAddress (Agent Wallet) because transactions are recorded against it
            // The backend will find the User associated with this Agent Wallet
            const appTxPromise = fetch(`/api/activity?address=${basicWalletAddress}`).then(res => res.json());

            // 3. Fetch Blockchain Transactions (Explorer)
            // We check the App Wallet Activity
            const chainTxPromise = fetch(`/api/wallet-activity?address=${basicWalletAddress}`).then(res => res.json());

            const [notificationsData, appTxData, chainTxData] = await Promise.all([
                notificationsPromise,
                appTxPromise,
                chainTxPromise
            ]);

            const mergedActivities: ActivityItem[] = [];
            const seenHashes = new Set<string>();

            // Process Notifications
            if (notificationsData.notifications) {
                notificationsData.notifications.forEach((n: any) => {
                    const isIncoming = n.amount && n.amount.startsWith('+');
                    const cleanAmount = n.amount ? n.amount.replace(/[+-]/g, '').split(' ')[0] : undefined;
                    const currency = n.amount ? n.amount.split(' ')[1] : undefined;

                    mergedActivities.push({
                        id: `notif-${n.id}`,
                        type: 'NOTIFICATION',
                        source: 'SYSTEM',
                        title: n.title,
                        subtitle: n.message,
                        timestamp: new Date(n.createdAt).getTime(),
                        amount: cleanAmount,
                        currency: currency,
                        isIncoming: isIncoming,
                        status: n.status === 'read' || n.status === 'unread' ? 'success' : 'pending',
                        notificationType: n.type
                    });
                });
            }

            // Process App Transactions (Prisma)
            if (appTxData.transactions) {
                appTxData.transactions.forEach((tx: any) => {
                    if (tx.txHash) seenHashes.add(tx.txHash.toLowerCase());

                    const isIncoming = tx.type === 'DEPOSIT' || tx.type === 'PAYMENT_RECEIVED';
                    let title = '';
                    let subtitle = '';

                    switch (tx.type) {
                        case 'DEPOSIT': title = 'Deposit'; subtitle = 'Funds added to App Wallet'; break;
                        case 'WITHDRAWAL': title = 'Withdrawal'; subtitle = 'Funds withdrawn from App Wallet'; break;
                        case 'PAYMENT_SENT': title = 'Payment Sent'; subtitle = `Sent to ${tx.toAddress.slice(0, 6)}...`; break;
                        case 'PAYMENT_RECEIVED': title = 'Payment Received'; subtitle = `Received from ${tx.fromAddress.slice(0, 6)}...`; break;
                        default: title = 'Transaction'; subtitle = 'App transaction';
                    }

                    mergedActivities.push({
                        id: `app-${tx.id}`,
                        type: 'TRANSACTION',
                        source: 'APP',
                        title: title,
                        subtitle: subtitle,
                        timestamp: new Date(tx.createdAt).getTime(),
                        amount: tx.amount,
                        currency: tx.tokenSymbol,
                        isIncoming: isIncoming,
                        status: tx.status === 'CONFIRMED' ? 'success' : 'failed',
                        hash: tx.txHash,
                        chainId: tx.chainId,
                        chainName: tx.chainId === 11155111 ? 'Sepolia' : 'Base Sepolia'
                    });
                });
            }

            // Process Blockchain Transactions (Explorer)
            // Only add if hash not seen in App Transactions (to avoid duplicates)
            if (chainTxData.transactions) {
                chainTxData.transactions.forEach((tx: any) => {
                    if (tx.hash && seenHashes.has(tx.hash.toLowerCase())) return;

                    const amount = (parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'))).toFixed(6);
                    const isIncoming = tx.type === 'received';
                    const date = new Date(tx.timeStamp * 1000);

                    mergedActivities.push({
                        id: `chain-${tx.hash}`,
                        type: 'TRANSACTION',
                        source: 'CHAIN',
                        title: isIncoming ? `Received ${tx.tokenSymbol}` : `Sent ${tx.tokenSymbol}`,
                        subtitle: `${tx.chainName} • On-chain transaction`,
                        timestamp: date.getTime(),
                        amount: amount,
                        currency: tx.tokenSymbol,
                        isIncoming: isIncoming,
                        status: tx.isError ? 'failed' : 'success',
                        hash: tx.hash,
                        chainId: tx.chainId,
                        chainName: tx.chainName
                    });
                });
            }

            // Sort by timestamp descending (newest first)
            mergedActivities.sort((a, b) => b.timestamp - a.timestamp);

            setActivities(mergedActivities);
            console.log('[ACTIVITY HOOK] Merged', mergedActivities.length, 'total activities');

        } catch (error) {
            console.error('[ACTIVITY HOOK] Failed to fetch activity:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userWalletAddress, basicWalletAddress]);

    useEffect(() => {
        fetchAllActivity();
    }, [fetchAllActivity]);

    return { activities, isLoading, refetch: fetchAllActivity };
}
