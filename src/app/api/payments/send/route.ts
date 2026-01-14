import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, createWalletClient, http, parseEther, parseUnits, Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ERC20 ABI for transfer
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// USDC address on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { receiverIdentifier, amount, token, senderWalletAddress } = body;

        // Validation
        if (!receiverIdentifier || !amount || !token || !senderWalletAddress) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log('[PAYMENT] Processing payment:', {
            from: senderWalletAddress,
            to: receiverIdentifier,
            amount,
            token,
        });

        // 1. Find receiver by username or wallet address
        const isAddress = receiverIdentifier.startsWith('0x') && receiverIdentifier.length === 42;

        let receiver;
        if (isAddress) {
            receiver = await prisma.user.findFirst({
                where: {
                    walletAddress: {
                        equals: receiverIdentifier,
                        mode: 'insensitive',
                    },
                },
            });
        } else {
            receiver = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: receiverIdentifier,
                        mode: 'insensitive',
                    },
                },
            });
        }

        if (!receiver) {
            return NextResponse.json(
                { error: 'Recipient not found' },
                { status: 404 }
            );
        }

        // 2. Find sender
        const sender = await prisma.user.findUnique({
            where: { walletAddress: senderWalletAddress },
        });

        if (!sender) {
            return NextResponse.json(
                { error: 'Sender not found' },
                { status: 404 }
            );
        }

        // 3. Get sender's basic wallet
        const senderBasicWallet = await prisma.basicAgentWallet.findUnique({
            where: { userWalletAddress: senderWalletAddress },
        });

        if (!senderBasicWallet) {
            return NextResponse.json(
                { error: 'Sender wallet not found' },
                { status: 404 }
            );
        }

        // 4. Get receiver's basic wallet address
        const receiverBasicWallet = await prisma.basicAgentWallet.findUnique({
            where: { userWalletAddress: receiver.walletAddress },
        });

        if (!receiverBasicWallet) {
            return NextResponse.json(
                { error: 'Recipient wallet not found' },
                { status: 404 }
            );
        }

        // 5. Decrypt sender's private key
        const crypto = await import('crypto');
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(senderBasicWallet.encryptionSalt, 'hex').slice(0, 32),
            Buffer.from(senderBasicWallet.encryptionSalt, 'hex').slice(0, 16)
        );
        let decrypted = decipher.update(senderBasicWallet.encryptedPrivateKey, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const privateKey = decrypted as `0x${string}`;

        // 6. Create wallet client
        const account = privateKeyToAccount(privateKey);
        const walletClient = createWalletClient({
            account,
            chain: baseSepolia,
            transport: http(),
        });

        const publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(),
        });

        let txHash: string;
        const receiverAddress = receiverBasicWallet.agentWalletAddress as Address;

        // 7. Execute transfer based on token type
        if (token === 'ETH') {
            // Send ETH
            const hash = await walletClient.sendTransaction({
                to: receiverAddress,
                value: parseEther(amount),
            });
            txHash = hash;
            console.log('[PAYMENT] ETH transfer tx:', hash);
        } else if (token === 'USDC') {
            // Send USDC
            const hash = await walletClient.writeContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [receiverAddress, parseUnits(amount, 6)],
            });
            txHash = hash;
            console.log('[PAYMENT] USDC transfer tx:', hash);
        } else {
            return NextResponse.json(
                { error: 'Unsupported token' },
                { status: 400 }
            );
        }

        // 8. Wait for transaction confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
        });

        console.log('[PAYMENT] Transaction confirmed:', receipt.status);

        // 9. Create payment record
        const payment = await prisma.payment.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                chainId: baseSepolia.id,
                tokenAddress: token === 'USDC' ? USDC_ADDRESS : '0x0000000000000000000000000000000000000000',
                tokenSymbol: token,
                amount: amount,
                txHash: txHash,
                status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED',
            },
        });

        // 10. Create transaction records for both sender and receiver
        await prisma.transaction.createMany({
            data: [
                {
                    userId: sender.id,
                    type: 'PAYMENT_SENT',
                    amount: amount,
                    tokenSymbol: token,
                    tokenAddress: token === 'USDC' ? USDC_ADDRESS : '0x0000000000000000000000000000000000000000',
                    txHash: txHash,
                    chainId: baseSepolia.id,
                    status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED',
                    fromAddress: senderBasicWallet.agentWalletAddress,
                    toAddress: receiverAddress,
                },
                {
                    userId: receiver.id,
                    type: 'PAYMENT_RECEIVED',
                    amount: amount,
                    tokenSymbol: token,
                    tokenAddress: token === 'USDC' ? USDC_ADDRESS : '0x0000000000000000000000000000000000000000',
                    txHash: txHash,
                    chainId: baseSepolia.id,
                    status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED',
                    fromAddress: senderBasicWallet.agentWalletAddress,
                    toAddress: receiverAddress,
                },
            ],
        });

        // 11. Create notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: sender.id,
                    title: 'Payment Sent',
                    message: `You sent ${amount} ${token} to @${receiver.username}`,
                    type: 'PAYMENT_SENT',
                    amount: `-${amount} ${token}`,
                    status: 'unread',
                },
                {
                    userId: receiver.id,
                    title: 'Payment Received',
                    message: `You received ${amount} ${token} from @${sender.username || 'someone'}`,
                    type: 'PAYMENT_RECEIVED',
                    amount: `+${amount} ${token}`,
                    status: 'unread',
                },
            ],
        });

        console.log('[PAYMENT] Payment completed successfully');

        return NextResponse.json({
            success: true,
            txHash,
            payment: {
                id: payment.id,
                amount: payment.amount.toString(),
                token: payment.tokenSymbol,
                status: payment.status,
            },
        });
    } catch (error) {
        console.error('[PAYMENT] Error:', error);
        return NextResponse.json(
            {
                error: 'Payment failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
