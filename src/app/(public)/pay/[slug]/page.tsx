"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
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
  const { userWalletAddress, sendToken, isLoading } = useAuthWallet();

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="cupi-card p-6 max-w-lg mx-auto mt-10">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">{error}</span>
        </div>
        <Link href="/home" className="mt-4 inline-flex text-sm font-medium text-primary">
          Return to home
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

  const status = isMerchantCheckout
    ? merchantSession?.status
    : isPaymentRequest
      ? paymentRequest?.status
      : link?.status;

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

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-lg mx-auto mt-6">
      <div className="flex items-center gap-3">
        <Link href="/home" className="rounded-lg border border-border p-2 hover:bg-secondary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {isMerchantCheckout
              ? "Institutional Checkout"
              : isPaymentRequest
                ? "Direct Payment Request"
                : "Invoice Request"}
          </p>
          <h1 className="text-2xl font-black tracking-tight">Pay with cUPI</h1>
        </div>
      </div>

      <section className="cupi-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-4xl font-black tracking-tight">
              {amount} {currency}
            </p>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider font-semibold ${isPaid || status === "PAID"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-border bg-secondary/30 text-muted-foreground"
              }`}
          >
            {status}
          </div>
        </div>

        {description && (
          <div className="p-3 rounded-lg border border-border/50 bg-secondary/10">
            <p className="text-xs text-muted-foreground uppercase font-medium">Description</p>
            <p className="text-sm mt-0.5">{description}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Recipient</p>
            {isMerchantCheckout ? (
              <div>
                <div className="mt-1 flex items-center gap-1.5 font-semibold">
                  <Store size={16} className="text-primary" />
                  <span>{merchantSession?.merchantName || "Merchant"}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Order #{merchantSession?.orderId}</p>
              </div>
            ) : isPaymentRequest ? (
              <div>
                <p className="mt-1 font-semibold flex items-center gap-1.5">
                  <UserCheck size={16} className="text-emerald-400" />
                  {paymentRequest?.requester.username
                    ? `@${paymentRequest.requester.username}`
                    : paymentRequest?.requester.fullName || "Contact"}
                </p>
                {paymentRequest?.requester.walletAddress && (
                  <button
                    onClick={() => copyAddress(paymentRequest.requester.walletAddress)}
                    className="mt-3 inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <Copy size={12} />
                    Copy address
                  </button>
                )}
              </div>
            ) : (
              <>
                <p className="mt-1 font-semibold">
                  {link?.creator.username ? `@${link.creator.username}` : link?.creator.fullName || "Unknown"}
                </p>
                {link?.creator.walletAddress && (
                  <button
                    onClick={() => copyAddress(link.creator.walletAddress)}
                    className="mt-3 inline-flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <Copy size={12} />
                    Copy address
                  </button>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Settlement</p>
            <p className="mt-1 font-semibold flex items-center gap-1 text-emerald-400">
              <ShieldCheck size={16} />
              {networkName?.toUpperCase()} Network
            </p>
            {isMerchantCheckout && merchantSession?.expiresAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Expires {new Date(merchantSession.expiresAt).toLocaleTimeString()}
              </p>
            ) : link?.expiresAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Expires {new Date(link.expiresAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">
                {isMerchantCheckout
                  ? "Instant Webhook Reconciled"
                  : isPaymentRequest
                    ? "Direct Wallet-to-Wallet Settlement"
                    : "Direct On-Chain Transfer"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isMerchantCheckout
                  ? "Merchants receive cryptographically signed HMAC webhooks immediately upon confirmation."
                  : isPaymentRequest
                    ? "Fulfilled instantly on-chain and notifies the requester."
                    : "Funds are transferred directly from your wallet to the recipient."}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method Selector (1-Tap Web3 Wallet vs Scan QR Code) */}
        {!isSettledOrExpired && !isSolanaCheckout && (
          <div className="flex rounded-xl bg-secondary/40 p-1 border border-border">
            <button
              type="button"
              onClick={() => setPayMethod("WALLET")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${payMethod === "WALLET"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Wallet size={14} />
              Connect & Pay
            </button>
            <button
              type="button"
              onClick={() => setPayMethod("QR")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all ${payMethod === "QR"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <QrCode size={14} />
              Scan QR / Mobile
            </button>
          </div>
        )}

        {/* QR Code Presentation */}
        {payMethod === "QR" && !isSettledOrExpired ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-secondary/10 space-y-4 text-center">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-neutral-200">
              <QRCodeSVG
                value={isSolanaCheckout && instructions?.network === "solana" ? instructions.solanaPayUrl : currentUrl}
                size={200}
                level="M"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {isSolanaCheckout ? "Scan with Phantom, Solflare or Backpack" : "Scan with Phantom, Solflare, or Camera"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {isSolanaCheckout
                  ? `Solana Pay request for ${amount} USDC. This page confirms automatically once the transfer lands on-chain.`
                  : `Scan this interactive payment URI with your mobile wallet to settle ${amount} ${currency} instantly.`}
              </p>
            </div>
            {isSolanaCheckout && instructions?.network === "solana" ? (
              <div className="flex flex-col items-center gap-2">
                <a
                  href={instructions.solanaPayUrl}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Smartphone size={14} />
                  Open in Solana wallet <ExternalLink size={12} />
                </a>
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for payment on Solana {instructions.cluster === "devnet" ? "devnet" : ""}
                </p>
              </div>
            ) : networkName?.toLowerCase() === "solana" && (
              <a
                href={phantomDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-1"
              >
                <Smartphone size={14} />
                Open in Phantom App <ExternalLink size={12} />
              </a>
            )}
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={paying || isSettledOrExpired}
            className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isPaid
              ? "Payment Completed"
              : isSettledOrExpired
                ? "Invoice Expired or Inactive"
                : `Pay ${amount} ${currency}`}
          </button>
        )}

        {txHash && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4 space-y-1">
            <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
              {isMerchantCheckout && !isPaid ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {isMerchantCheckout && !isPaid ? "Submitted · awaiting on-chain confirmation" : "Verified on-chain"}
            </p>
            <p className="font-mono text-xs break-all text-foreground mt-1">{txHash}</p>
            {isMerchantCheckout && merchantSession?.successUrl && (
              <a
                href={merchantSession.successUrl}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 pt-1 font-semibold"
              >
                Return to Merchant Store <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
