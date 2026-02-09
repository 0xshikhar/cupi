"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Store,
  UserCheck,
  QrCode,
  Smartphone,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import type { CheckoutPaymentInstructions } from "@/lib/merchant/types";
import { getTxExplorerUrl } from "@/lib/utils/explorer";
import { DEFAULT_CHAIN } from "@/config/chains";

type PaymentLinkDetail = {
  id: string;
  slug: string;
  amount: string;
  tokenSymbol: "ETH" | "USDC";
  description?: string | null;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  expiresAt?: string | null;
  maxUses?: number | null;
  usedCount: number;
  creator: {
    walletAddress: string;
    username?: string | null;
    fullName?: string | null;
  };
};

type MerchantSessionDetail = {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  network: string;
  description?: string | null;
  status: "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED";
  checkoutUrl: string;
  callbackUrl: string;
  successUrl?: string | null;
  cancelUrl?: string | null;
  txHash?: string | null;
  payerAddress?: string | null;
  expiresAt: string;
  merchantName?: string;
  paymentInstructions?: CheckoutPaymentInstructions;
};

const CONFIRM_POLL_MS = 4000;

type PaymentRequestDetail = {
  id: string;
  amount: string;
  currency: string;
  network: string;
  description?: string | null;
  status: "REQUESTED" | "PAID" | "DECLINED" | "EXPIRED" | "CANCELLED";
  txHash?: string | null;
  expiresAt?: string | null;
  requester: {
    id: string;
    username?: string | null;
    fullName?: string | null;
    walletAddress: string;
  };
};

export default function PayInvoicePage() {
  const params = useParams<{ slug: string }>();
  const { userWalletAddress, sendToken, isLoading, login } = useAuthWallet();

  const isMerchantCheckout = params?.slug?.startsWith("merchant-");
  const isPaymentRequest = params?.slug?.startsWith("request-");

  const [link, setLink] = useState<PaymentLinkDetail | null>(null);
  const [merchantSession, setMerchantSession] = useState<MerchantSessionDetail | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequestDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"WALLET" | "QR">("WALLET");

  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const phantomDeepLink = currentUrl
    ? `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`
    : "#";

  useEffect(() => {
    const loadInvoiceOrSession = async () => {
      try {
        if (isMerchantCheckout) {
          const sessionId = params.slug.replace("merchant-", "");
          const response = await fetch(`/api/merchant/checkout/${sessionId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to load merchant checkout session");
          }
          setMerchantSession(data.session);
          if (data.session.txHash) {
            setTxHash(data.session.txHash);
          }
        } else if (isPaymentRequest) {
          const requestId = params.slug.replace("request-", "");
          const response = await fetch(`/api/payment-requests/${requestId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to load payment request");
          }
          setPaymentRequest(data.request);
          if (data.request.txHash) {
            setTxHash(data.request.txHash);
          }
        } else {
          const response = await fetch(`/api/payment-links/${params.slug}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to load invoice");
          }
          setLink(data.link);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment invoice");
      } finally {
        setLoading(false);
      }
    };

    if (params?.slug) {
      loadInvoiceOrSession();
    }
  }, [params?.slug, isMerchantCheckout, isPaymentRequest]);

  const instructions = merchantSession?.paymentInstructions;
  const isSolanaCheckout = isMerchantCheckout && instructions?.network === "solana";

  useEffect(() => {
    if (isSolanaCheckout) setPayMethod("QR");
  }, [isSolanaCheckout]);

  /** Asks the server to verify the transfer on-chain. Returns true once the session is PAID. */
  const confirmMerchantPayment = useCallback(
    async (sessionId: string, submittedTxHash?: string) => {
      const response = await fetch(`/api/merchant/checkout/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedTxHash ? { txHash: submittedTxHash } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to verify checkout payment");

      setMerchantSession((current) => (current ? { ...current, ...data.session } : data.session));
      if (data.session.txHash) setTxHash(data.session.txHash);

      if (data.session.status === "PAID") {
        toast.success("Payment verified on-chain");
        if (data.session.successUrl) {
          setTimeout(() => {
            window.location.href = data.session.successUrl;
          }, 2000);
        }
        return true;
      }
      return false;
    },
    []
  );

  // Solana Pay: the payer signs in their own wallet, so poll until the reference shows up on-chain.
  const merchantSessionId = merchantSession?.id;
  const merchantStatus = merchantSession?.status;
  useEffect(() => {
    if (!isSolanaCheckout || !merchantSessionId || merchantStatus !== "PENDING") return;
    const timer = setInterval(() => {
      confirmMerchantPayment(merchantSessionId).catch(() => undefined);
    }, CONFIRM_POLL_MS);
    return () => clearInterval(timer);
  }, [isSolanaCheckout, merchantSessionId, merchantStatus, confirmMerchantPayment]);

  const handlePay = async () => {
    if (!userWalletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setPaying(true);
    try {
      if (isMerchantCheckout && merchantSession) {
        if (instructions?.network !== "base") {
          throw new Error("This checkout settles on Solana. Scan the QR code with a Solana wallet.");
        }

        toast.info(`Paying ${merchantSession.merchantName || "merchant"}...`);
        const executedTxHash = await sendToken({
          to: instructions.recipient,
          amount: instructions.amount,
          token: "USDC",
          executionPreference: "gasless-preferred",
        });
        setTxHash(executedTxHash);

        let settled = await confirmMerchantPayment(merchantSession.id, executedTxHash);
        for (let attempt = 0; !settled && attempt < 10; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_MS));
          settled = await confirmMerchantPayment(merchantSession.id, executedTxHash);
        }
        if (!settled) toast.info("Transaction submitted. Confirmation is taking longer than usual.");
      } else if (isPaymentRequest && paymentRequest) {
        toast.info("Sending payment to requester...");
        const executedTxHash = await sendToken({
          to: paymentRequest.requester.walletAddress,
          amount: paymentRequest.amount,
          token: (paymentRequest.currency as "USDC" | "ETH") || "USDC",
          executionPreference: "gasless-preferred",
        });

        const patchRes = await fetch(`/api/payment-requests/${paymentRequest.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pay",
            txHash: executedTxHash,
            payerUserId: userWalletAddress,
          }),
        });

        const patchData = await patchRes.json();
        if (!patchRes.ok) {
          throw new Error(patchData.error || "Payment sent but failed to update status");
        }

        setTxHash(executedTxHash);
        setPaymentRequest(patchData.request);
        toast.success("Payment request fulfilled successfully!");
      } else if (link) {
        toast.info("Submitting payment via your wallet...");
        const executedTxHash = await sendToken({
          to: link.creator.walletAddress,
          amount: link.amount,
          token: link.tokenSymbol,
          executionPreference: "gasless-preferred",
        });

        const response = await fetch(`/api/payment-links/${link.slug}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderWalletAddress: userWalletAddress,
            txHash: executedTxHash,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to finalize payment record");
        }

        setTxHash(executedTxHash);
        setLink((current) =>
          current
            ? {
              ...current,
              status: data.paymentLink?.status || current.status,
              usedCount: data.paymentLink?.usedCount ?? current.usedCount + 1,
            }
            : current
        );
        toast.success("Payment completed successfully!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    toast.success("Address copied to clipboard");
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-6 w-40 cupi-skeleton" />
        <div className="h-64 cupi-skeleton rounded-3xl" />
        <div className="h-14 cupi-skeleton rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl border border-border p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-lg font-bold">This payment link isn&apos;t available</h1>
          <p className="text-sm text-muted-foreground mt-1">{error}. Ask the sender for a new link.</p>
        </div>
        <Link href="/" className="inline-flex text-sm font-semibold text-primary hover:underline">
          What is cUPI?
        </Link>
      </div>
    );
  }

  // Display details for Merchant Checkout, Payment Request, or P2P Payment Link
  const amount = isMerchantCheckout
    ? merchantSession?.amount
    : isPaymentRequest
      ? paymentRequest?.amount
      : link?.amount;

  const currency = isMerchantCheckout
    ? merchantSession?.currency
    : isPaymentRequest
      ? paymentRequest?.currency
      : link?.tokenSymbol;

  const description = isMerchantCheckout
    ? merchantSession?.description
    : isPaymentRequest
      ? paymentRequest?.description
      : link?.description;

  const isPaid = isMerchantCheckout
    ? merchantSession?.status === "PAID"
    : isPaymentRequest
      ? paymentRequest?.status === "PAID"
      : false;

  const isSettledOrExpired = isMerchantCheckout
    ? merchantSession?.status !== "PENDING"
    : isPaymentRequest
      ? paymentRequest?.status !== "REQUESTED"
      : link?.status !== "ACTIVE";

  const networkName = isMerchantCheckout
    ? merchantSession?.network
    : isPaymentRequest
      ? paymentRequest?.network
      : "Base";

  const payeeName = isMerchantCheckout
    ? merchantSession?.merchantName || "Merchant"
    : isPaymentRequest
      ? paymentRequest?.requester.username
        ? `@${paymentRequest.requester.username}`
        : paymentRequest?.requester.fullName || "Your contact"
      : link?.creator.username
        ? `@${link.creator.username}`
        : link?.creator.fullName || "Recipient";

  const payeeAddress = isPaymentRequest ? paymentRequest?.requester.walletAddress : link?.creator.walletAddress;
  const kindLabel = isMerchantCheckout ? "Checkout" : isPaymentRequest ? "Payment request" : "Invoice";
  const expiresAt = isMerchantCheckout ? merchantSession?.expiresAt : isPaymentRequest ? paymentRequest?.expiresAt : link?.expiresAt;
  const isSolanaNetwork = networkName?.toLowerCase() === "solana";
  const explorerUrl = txHash
    ? isSolanaNetwork
      ? `https://solscan.io/tx/${txHash}${instructions?.network === "solana" && instructions.cluster === "devnet" ? "?cluster=devnet" : ""}`
      : getTxExplorerUrl(txHash, DEFAULT_CHAIN.id)
    : null;
  const shortHash = txHash ? `${txHash.slice(0, 10)}…${txHash.slice(-8)}` : "";

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{kindLabel}</p>
        <h1 className="text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
          {isMerchantCheckout ? <Store size={22} className="shrink-0" /> : <UserCheck size={22} className="shrink-0" />}
          <span className="truncate">{isPaymentRequest ? `${payeeName} requested` : `Pay ${payeeName}`}</span>
        </h1>
      </div>

      <section className="bg-white rounded-3xl border border-border shadow-sm sm:border-2 sm:border-black sm:shadow-[6px_6px_0_0_#000] overflow-hidden">
        {/* Amount */}
        <div className="p-6 text-center border-b border-border">
          <p className="text-sm text-muted-foreground">{isPaid ? "Amount paid" : "Amount due"}</p>
          <p className="text-5xl font-black tracking-tighter tabular-nums mt-1">
            {amount}
            <span className="text-xl font-bold text-muted-foreground ml-2">{currency}</span>
          </p>
          {description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{description}</p>}
        </div>

        {/* Details */}
        <dl className="px-6 py-4 space-y-3 text-sm">
          {isMerchantCheckout && merchantSession?.orderId && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Order</dt>
              <dd className="font-mono font-semibold truncate">{merchantSession.orderId}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Network</dt>
            <dd className="font-semibold inline-flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSolanaNetwork ? "bg-purple-500" : "bg-blue-500"}`} />
              {isSolanaNetwork ? "Solana" : "Base"}
              {instructions?.network === "solana" && instructions.cluster === "devnet" && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-secondary">devnet</span>
              )}
            </dd>
          </div>
          {payeeAddress && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">To</dt>
              <dd>
                <button
                  onClick={() => copyAddress(payeeAddress)}
                  className="font-mono font-semibold inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  {payeeAddress.slice(0, 6)}…{payeeAddress.slice(-4)}
                  <Copy size={12} />
                </button>
              </dd>
            </div>
          )}
          {expiresAt && !isSettledOrExpired && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Expires</dt>
              <dd className="font-semibold">
                {isMerchantCheckout
                  ? new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : new Date(expiresAt).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>

        {/* Action / status */}
        <div className="p-6 pt-2 space-y-4">
          {isPaid ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600" />
              <p className="font-bold text-emerald-900">Payment complete</p>
              <p className="text-xs text-emerald-800/80">Verified on-chain. {isMerchantCheckout ? "The merchant has been notified." : "The requester has been notified."}</p>
            </div>
          ) : isSettledOrExpired ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center space-y-1">
              <AlertTriangle className="h-8 w-8 mx-auto text-amber-600" />
              <p className="font-bold text-amber-900">This payment is no longer active</p>
              <p className="text-xs text-amber-800/80">It has expired or was already completed. Ask {payeeName} for a new link.</p>
            </div>
          ) : (
            <>
              {!isSolanaCheckout && (
                <div className="flex rounded-xl bg-secondary p-1" role="tablist" aria-label="Payment method">
                  {([
                    { key: "WALLET", label: "Pay with cUPI", icon: Wallet },
                    { key: "QR", label: "Other wallet", icon: QrCode },
                  ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={payMethod === key}
                      onClick={() => setPayMethod(key)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${payMethod === key ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {payMethod === "QR" ? (
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-white rounded-2xl border border-border shadow-sm">
                    <QRCodeSVG
                      value={isSolanaCheckout && instructions?.network === "solana" ? instructions.solanaPayUrl : currentUrl}
                      size={208}
                      level="M"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {isSolanaCheckout ? "Scan with Phantom, Solflare or Backpack" : "Scan to open on your phone"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {isSolanaCheckout
                        ? `Solana Pay request for ${amount} USDC. This page updates automatically once the transfer lands.`
                        : "Open this payment page on another device to pay from there."}
                    </p>
                  </div>
                  {isSolanaCheckout && instructions?.network === "solana" ? (
                    <>
                      <a href={instructions.solanaPayUrl} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                        <Smartphone size={16} />
                        Open in Solana wallet
                      </a>
                      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Waiting for payment…
                      </p>
                    </>
                  ) : isSolanaNetwork ? (
                    <a href={phantomDeepLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                      <Smartphone size={14} />
                      Open in Phantom <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              ) : (
                <button
                  onClick={userWalletAddress ? handlePay : login}
                  disabled={paying}
                  className="w-full h-14 rounded-2xl bg-black text-white font-bold text-base inline-flex items-center justify-center gap-2 hover:bg-zinc-800 active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {txHash ? "Confirming on-chain…" : "Waiting for signature…"}
                    </>
                  ) : userWalletAddress ? (
                    `Pay ${amount} ${currency}`
                  ) : (
                    "Sign in to pay"
                  )}
                </button>
              )}
            </>
          )}

          {txHash && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                {isPaid ? <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> : <Loader2 size={14} className="animate-spin shrink-0" />}
                <span className="font-mono truncate">{shortHash}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-semibold shrink-0">
                View on explorer <ExternalLink size={12} />
              </span>
            </a>
          )}

          {isMerchantCheckout && isPaid && merchantSession?.successUrl && (
            <a href={merchantSession.successUrl} className="btn-primary w-full inline-flex items-center justify-center gap-2">
              Return to {merchantSession.merchantName || "merchant"}
            </a>
          )}
          {isMerchantCheckout && !isPaid && merchantSession?.cancelUrl && (
            <a href={merchantSession.cancelUrl} className="block text-center text-xs font-semibold text-muted-foreground hover:text-foreground">
              Cancel and return to {merchantSession.merchantName || "merchant"}
            </a>
          )}
        </div>
      </section>

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck size={13} />
        You approve the transfer in your own wallet. cUPI never holds your funds.
      </p>
    </div>
  );
}
