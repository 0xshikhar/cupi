"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { createWalletClient, custom, encodeFunctionData, erc20Abi, parseUnits, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import { useFundWallet, useWallets } from "@privy-io/react-auth";
import { ArrowLeft, Check, ChevronRight, Copy, CreditCard, Droplets, ExternalLink, Loader2, QrCode, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN } from "@/config/chains";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: string, token: string) => void;
}

type View = "menu" | "buy" | "receive" | "faucet" | "wallet";
type Token = "USDC" | "ETH";

const QUICK_AMOUNTS = ["10", "25", "50", "100"];
const CHAIN = (DEFAULT_CHAIN.id as number) === base.id ? base : baseSepolia;
const IS_TESTNET: boolean = DEFAULT_CHAIN.testnet;
const USDC_ADDRESS = CONTRACT_ADDRESSES[DEFAULT_CHAIN.id].USDC as Address;

const FAUCETS = [
  { name: "Circle USDC faucet", token: "USDC", href: "https://faucet.circle.com", hint: "Pick “Base Sepolia”, paste your address" },
  { name: "Coinbase ETH faucet", token: "ETH", href: "https://portal.cdp.coinbase.com/products/faucet", hint: "Gas for transfers on Base Sepolia" },
];

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.18 },
};

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { userWalletAddress, balances } = useAuthWallet();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();

  const [view, setView] = useState<View>("menu");
  const [amount, setAmount] = useState("25");
  const [token, setToken] = useState<Token>("USDC");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  // An external wallet (MetaMask, Phantom EVM, Coinbase…) that is not the embedded Privy wallet
  const externalWallet = useMemo(
    () => wallets.find((w) => w.walletClientType !== "privy" && w.address.toLowerCase() !== userWalletAddress?.toLowerCase()),
    [wallets, userWalletAddress]
  );

  useEffect(() => {
    if (!isOpen) {
      setView("menu");
      setBusy(false);
    }
  }, [isOpen]);

  const copyAddress = async () => {
    if (!userWalletAddress) return;
    await navigator.clipboard.writeText(userWalletAddress);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleBuy = async () => {
    if (!userWalletAddress) return;
    setBusy(true);
    try {
      await fundWallet(userWalletAddress, { chain: CHAIN, amount, asset: "USDC" });
      onSuccess?.(amount, "USDC");
    } catch (err) {
      console.error("[TOP UP] On-ramp failed:", err);
      toast.error(
        IS_TESTNET
          ? "Card on-ramps only settle on mainnet. Use the free testnet faucet instead."
          : "Card purchase is unavailable right now. Try receiving from another wallet."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleWalletTransfer = async () => {
    if (!externalWallet || !userWalletAddress) return;
    const value = amount.trim();
    if (!/^\d+(\.\d+)?$/.test(value) || Number(value) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setBusy(true);
    try {
      await externalWallet.switchChain(CHAIN.id).catch(() => undefined);
      const client = createWalletClient({
        account: externalWallet.address as Address,
        chain: CHAIN,
        transport: custom(await externalWallet.getEthereumProvider()),
      });

      const hash =
        token === "ETH"
          ? await client.sendTransaction({ to: userWalletAddress as Address, value: parseUnits(value, 18) })
          : await client.sendTransaction({
              to: USDC_ADDRESS,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [userWalletAddress as Address, parseUnits(value, 6)],
              }),
            });

      toast.success(`Sent ${value} ${token} to your cUPI wallet`, { description: `${hash.slice(0, 10)}…` });
      if (onSuccess) onSuccess(value, token);
      else onClose();
    } catch (err) {
      console.error("[TOP UP] Wallet transfer failed:", err);
      toast.error(err instanceof Error && /reject|denied/i.test(err.message) ? "Transfer cancelled" : "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  const methods: { id: View; title: string; subtitle: string; icon: React.ElementType; tint: string; tag?: string; hidden?: boolean }[] = [
    { id: "buy", title: "Buy with card", subtitle: "Apple Pay, Google Pay or debit card", icon: CreditCard, tint: "bg-violet-100 text-violet-700", tag: "MoonPay · Coinbase" },
    { id: "receive", title: "Receive crypto", subtitle: "From an exchange or any wallet", icon: QrCode, tint: "bg-sky-100 text-sky-700" },
    { id: "faucet", title: "Free test money", subtitle: "Get testnet USDC + ETH in a minute", icon: Droplets, tint: "bg-emerald-100 text-emerald-700", tag: "Testnet", hidden: !IS_TESTNET },
    { id: "wallet", title: "From my other wallet", subtitle: externalWallet ? `${externalWallet.address.slice(0, 6)}…${externalWallet.address.slice(-4)}` : "", icon: Wallet, tint: "bg-amber-100 text-amber-700", hidden: !externalWallet },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[400px] p-0 gap-0 overflow-hidden rounded-[2rem] sm:rounded-[2rem] border-4 border-black shadow-[8px_8px_0_0_#000] bg-white [&>button.absolute]:z-10 [&>button.absolute]:bg-white [&>button.absolute]:border-2 [&>button.absolute]:border-black [&>button.absolute]:rounded-full [&>button.absolute]:p-1 [&>button.absolute]:opacity-100">
        {/* Playful header */}
        <div className="relative bg-primary px-6 pt-7 pb-6 overflow-hidden border-b-4 border-black">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          {[
            { label: "$", className: "right-14 top-6 w-12 h-12 text-xl", delay: 0 },
            { label: "◎", className: "right-28 top-14 w-9 h-9 text-base", delay: 0.4 },
            { label: "¢", className: "right-12 top-[5.2rem] w-8 h-8 text-sm", delay: 0.8 },
          ].map((coin) => (
            <motion.span
              key={coin.label}
              aria-hidden
              className={`absolute ${coin.className} rounded-full bg-white border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center font-black`}
              animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: coin.delay }}
            >
              {coin.label}
            </motion.span>
          ))}

          <div className="relative">
            {view !== "menu" && (
              <button
                onClick={() => setView("menu")}
                className="mb-3 inline-flex items-center gap-1 text-xs font-bold bg-white/70 hover:bg-white border-2 border-black rounded-full px-2.5 py-1 transition-colors"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <DialogTitle className="text-3xl font-black tracking-tighter text-black">Add money</DialogTitle>
            <DialogDescription className="mt-1 pr-24 text-sm font-semibold text-black/70">
              Balance {Number(balances.usdc || 0).toFixed(2)} USDC
              <span className="block text-xs font-medium text-black/50">{Number(balances.eth || 0).toFixed(4)} ETH for gas</span>
            </DialogDescription>
          </div>
        </div>

        <div className="p-5 min-h-[300px]">
          <AnimatePresence mode="wait" initial={false}>
            {view === "menu" && (
              <motion.ul key="menu" {...slide} className="space-y-2.5">
                {methods
                  .filter((m) => !m.hidden)
                  .map(({ id, title, subtitle, icon: Icon, tint, tag }) => (
                    <li key={id}>
                      <button
                        onClick={() => setView(id)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-black bg-white text-left shadow-[3px_3px_0_0_#000] outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 hover:shadow-[1px_1px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <span className={`w-11 h-11 shrink-0 rounded-xl ${tint} flex items-center justify-center`}>
                          <Icon size={20} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-bold text-sm">{title}</span>
                            {tag && <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-black text-white">{tag}</span>}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
              </motion.ul>
            )}

            {view === "buy" && (
              <motion.div key="buy" {...slide} className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">How much?</p>
                  <div className="flex items-baseline justify-center gap-1 py-2">
                    <span className="text-3xl font-black text-muted-foreground">$</span>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                      className="w-40 text-center text-5xl font-black tracking-tighter bg-transparent focus:outline-none"
                      aria-label="Amount in USD"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        onClick={() => setAmount(q)}
                        className={`py-2 rounded-xl border-2 border-black text-sm font-bold transition-all ${amount === q ? "bg-black text-white" : "bg-white hover:bg-secondary"}`}
                      >
                        ${q}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleBuy} disabled={busy || !Number(amount)} className="w-full h-14 rounded-2xl bg-black text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-60 transition-colors">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  Buy ${amount || "0"} of USDC
                </button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Card payments are processed by MoonPay or Coinbase. USDC lands directly in your self-custodial wallet.
                </p>
              </motion.div>
            )}

            {view === "receive" && (
              <motion.div key="receive" {...slide} className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] bg-white">
                  {userWalletAddress && <QRCodeSVG value={userWalletAddress} size={176} level="M" />}
                </div>
                <button onClick={copyAddress} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-zinc-200 transition-colors">
                  <span className="font-mono text-xs truncate">{userWalletAddress}</span>
                  {copied ? <Check size={16} className="shrink-0 text-emerald-600" /> : <Copy size={16} className="shrink-0" />}
                </button>
                <p className="text-xs font-semibold px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  Only send USDC or ETH on <b>{DEFAULT_CHAIN.name}</b>. Other networks will be lost.
                </p>
              </motion.div>
            )}

            {view === "faucet" && (
              <motion.div key="faucet" {...slide} className="space-y-3">
                <ol className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">1</span>
                    <button onClick={copyAddress} className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-secondary hover:bg-zinc-200 text-left transition-colors">
                      <span className="text-sm font-semibold">Copy your address</span>
                      {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                  </li>
                  {FAUCETS.map((f, i) => (
                    <li key={f.name} className="flex items-center gap-3">
                      <span className="w-7 h-7 shrink-0 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">{i + 2}</span>
                      <a
                        href={f.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      >
                        <span>
                          <span className="block text-sm font-bold">{f.name}</span>
                          <span className="block text-[11px] text-muted-foreground">{f.hint}</span>
                        </span>
                        <ExternalLink size={14} className="shrink-0" />
                      </a>
                    </li>
                  ))}
                </ol>
                <p className="text-[11px] text-center text-muted-foreground pt-1">Your balance updates automatically once the faucet transfer confirms.</p>
              </motion.div>
            )}

            {view === "wallet" && externalWallet && (
              <motion.div key="wallet" {...slide} className="space-y-5">
                <div className="flex rounded-xl bg-secondary p-1">
                  {(["USDC", "ETH"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setToken(t)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${token === t ? "bg-white shadow-sm" : "text-muted-foreground"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex items-baseline justify-center gap-2">
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                    className="w-44 text-center text-5xl font-black tracking-tighter bg-transparent focus:outline-none"
                    aria-label={`Amount in ${token}`}
                  />
                  <span className="text-lg font-bold text-muted-foreground">{token}</span>
                </div>
                <button onClick={handleWalletTransfer} disabled={busy} className="w-full h-14 rounded-2xl bg-black text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-60 transition-colors">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Wallet size={18} />}
                  Move {amount || "0"} {token} to cUPI
                </button>
                <p className="text-[11px] text-center text-muted-foreground">
                  You&apos;ll confirm in {externalWallet.walletClientType} on {DEFAULT_CHAIN.name}.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpModal;
