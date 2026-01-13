"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useAuthWallet } from "@/lib/hooks/useAuthWallet";
import { encodeFunctionData, parseUnits } from "viem";
import { CHAIN_TOKENS, SUPPORTED_CHAINS, ERC20_ABI } from "@/lib/data";
import { toast } from "sonner";

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (amount: string, token: string) => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [selectedChain, setSelectedChain] = useState<string>("");
    const [selectedToken, setSelectedToken] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [isDepositing, setIsDepositing] = useState<boolean>(false);
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [copied, setCopied] = useState<boolean>(false);

    const { sendTransaction } = useSendTransaction();
    const { wallets } = useWallets();
    const { basicWalletAddress } = useAuthWallet();

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedChain("");
            setSelectedToken("");
            setAmount("");
            setError("");
            setIsSwitchingNetwork(false);
        }
    }, [isOpen]);

    // Get available tokens for selected chain
    const availableTokens = selectedChain ? CHAIN_TOKENS[selectedChain] || [] : [];

    // Find selected token info
    const selectedTokenInfo = availableTokens.find(
        (token) => token.symbol === selectedToken
    );

    // Find selected chain info
    const selectedChainInfo = SUPPORTED_CHAINS.find(
        (chain) => chain.id === selectedChain
    );

    // Format address for display
    const formatAddress = (addr?: string, prefix: number = 6, suffix: number = 6) => {
        if (!addr) return "";
        if (addr.length <= prefix + suffix + 3) return addr;
        return `${addr.slice(0, prefix)}…${addr.slice(-suffix)}`;
    };

    const handleCopy = async () => {
        if (!basicWalletAddress) return;
        try {
            await navigator.clipboard.writeText(basicWalletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            toast.success("Address copied!");
        } catch {
            toast.error("Failed to copy address");
        }
    };

    const handleDeposit = async () => {
        if (!selectedChain || !selectedToken || !amount || !basicWalletAddress) {
            setError("Please fill in all fields");
            return;
        }

        if (!selectedTokenInfo || !selectedChainInfo) {
            setError("Invalid token or chain selected");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (!wallets || wallets.length === 0) {
            setError("No connected wallet found. Please connect your wallet first.");
            return;
        }

        setIsDepositing(true);
        setError("");

        try {
            const currentWallet = wallets[0];

            // Check if wallet is on the correct chain
            if (currentWallet.chainId !== `eip155:${selectedChainInfo.chainId}`) {
                console.log(`Switching from chain ${currentWallet.chainId} to ${selectedChainInfo.chainId}`);
                setIsSwitchingNetwork(true);

                try {
                    await currentWallet.switchChain(selectedChainInfo.chainId);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    setIsSwitchingNetwork(false);
                } catch (switchError: any) {
                    console.error("Failed to switch network:", switchError);
                    setError(`Please switch your wallet to ${selectedChainInfo.name} manually and try again.`);
                    setIsDepositing(false);
                    setIsSwitchingNetwork(false);
                    return;
                }
            }

            // Prepare transaction data
            const transactionData: any = {
                to: basicWalletAddress,
            };

            if (selectedTokenInfo.symbol === "ETH") {
                // For native ETH, send as value
                transactionData.value = parseUnits(amount, selectedTokenInfo.decimals);
            } else {
                // For ERC20 tokens, use transfer function
                const amountInWei = parseUnits(amount, selectedTokenInfo.decimals);

                transactionData.to = selectedTokenInfo.address;
                transactionData.data = encodeFunctionData({
                    abi: ERC20_ABI,
                    functionName: "transfer",
                    args: [basicWalletAddress as `0x${string}`, amountInWei],
                });
            }

            // Send transaction through Privy
            const txHash = await sendTransaction(
                transactionData,
                {
                    address: wallets[0].address
                }
            );

            if (txHash) {
                console.log("Deposit successful! Transaction hash:", txHash);
                toast.success(`Successfully deposited ${amount} ${selectedToken}!`);

                if (onSuccess) {
                    onSuccess(amount, selectedToken);
                } else {
                    onClose();
                }
            }
        } catch (error: any) {
            console.error("Deposit failed:", error);
            setError(error.message || "Transaction failed. Please try again.");
            toast.error("Deposit failed");
        } finally {
            setIsDepositing(false);
            setIsSwitchingNetwork(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="mx-4 w-[calc(100vw-2rem)] max-w-[500px] max-h-[90vh] overflow-y-auto sm:mx-auto sm:w-full">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl font-semibold">Add Funds</DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed">
                        Deposit tokens to your wallet for P2P payments.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    {/* Agent Wallet Address Display */}
                    {basicWalletAddress && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Your Wallet Address</label>
                            <div className="flex items-center gap-2 p-2 bg-muted/50 border rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-mono text-muted-foreground whitespace-nowrap overflow-hidden">
                                        {formatAddress(basicWalletAddress, 10, 10)}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    aria-label="Copy wallet address"
                                    onClick={handleCopy}
                                    className="h-8 px-2"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Status Messages */}
                    <div className="space-y-3">
                        {(!wallets || wallets.length === 0) && (
                            <div className="flex items-start gap-3 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                                <div className="w-4 h-4 rounded-full bg-destructive/20 flex-shrink-0 mt-0.5"></div>
                                <span>No wallet connected. Please connect your wallet to make deposits.</span>
                            </div>
                        )}

                        {wallets && wallets.length > 0 && selectedChainInfo &&
                            wallets[0].chainId !== `eip155:${selectedChainInfo.chainId}` && (
                                <div className="flex items-start gap-3 p-2 text-sm text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                    <div className="w-4 h-4 rounded-full bg-orange-200 dark:bg-orange-800 flex-shrink-0 mt-0.5"></div>
                                    <span className="text-xs">⚠️ You&apos;ll be prompted to switch to {selectedChainInfo.name} before depositing.</span>
                                </div>
                            )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        {/* Chain Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Select Chain</label>
                            <Select value={selectedChain} onValueChange={setSelectedChain}>
                                <SelectTrigger className="h-11 border-input">
                                    <SelectValue placeholder="Choose a blockchain network" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPORTED_CHAINS.map((chain) => (
                                        <SelectItem key={chain.id} value={chain.id}>
                                            <span className="font-medium">{chain.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Token Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Select Token</label>
                            <Select
                                value={selectedToken}
                                onValueChange={setSelectedToken}
                                disabled={!selectedChain}
                            >
                                <SelectTrigger className="h-11 border-input">
                                    <SelectValue placeholder="Choose a token" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTokens.map((token) => (
                                        <SelectItem key={token.symbol} value={token.symbol}>
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-medium">{token.symbol}</span>
                                                <span className="text-muted-foreground text-sm ml-2">
                                                    {token.name}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Amount</label>
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    placeholder="0.0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="h-11 text-base"
                                    disabled={!selectedToken}
                                    step="any"
                                    min="0"
                                />
                                {selectedTokenInfo && (
                                    <p className="text-xs text-muted-foreground">
                                        Minimum: 0.000001 {selectedTokenInfo.symbol}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-3 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                            <div className="w-4 h-4 rounded-full bg-destructive/20 flex-shrink-0 mt-0.5"></div>
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-3 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isDepositing}
                        className="flex-1 sm:flex-none h-11"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeposit}
                        disabled={
                            !selectedChain ||
                            !selectedToken ||
                            !amount ||
                            !basicWalletAddress ||
                            !wallets ||
                            wallets.length === 0 ||
                            isDepositing ||
                            isSwitchingNetwork
                        }
                        className="flex-1 sm:flex-none h-11"
                    >
                        {isSwitchingNetwork ? "Switching Network..." :
                            isDepositing ? "Processing..." :
                                (wallets && wallets.length > 0 && selectedChainInfo &&
                                    wallets[0].chainId !== `eip155:${selectedChainInfo.chainId}` ?
                                    `Switch to ${selectedChainInfo.name?.split(' ')[0]} & Deposit` : "Deposit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TopUpModal;
