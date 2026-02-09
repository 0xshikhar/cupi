"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  CreditCard, 
  Globe, 
  ShieldCheck, 
  Settings, 
  HelpCircle, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  Key, 
  Activity, 
  Server, 
  Trash2, 
  Sparkles, 
  Award, 
  Send, 
  RefreshCw,
  Info,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

// ==========================================
// 1. PAYMENT METHODS MODAL
// ==========================================
export function PaymentMethodsModal({
  isOpen,
  onClose,
  walletAddress,
  username
}: {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  username?: string | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Payment Methods</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground font-medium">
            Manage your connected multi-chain settlement rails and public recipient handles.
          </p>

          {/* Active EVM Smart Account */}
          <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">EVM Smart Account (Base / Arbitrum)</span>
              <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs bg-background p-2.5 rounded-lg border border-border">
              <span className="truncate pr-2">{walletAddress}</span>
              <button 
                onClick={() => handleCopy(walletAddress, "EVM Address")}
                className="hover:text-primary transition-colors flex-shrink-0"
              >
                {copied === "EVM Address" ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Standard: ERC-4337 Account Abstraction</span>
              <a 
                href={`https://basescan.org/address/${walletAddress}`} 
                target="_blank" 
                rel="noreferrer" 
                className="text-primary flex items-center gap-1 hover:underline"
              >
                Explorer <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Solana Pay SPL Rail */}
          <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Solana Pay (USDC SPL)</span>
              <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-bold">SOLANA PAY V2</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct sub-second settlement for Solana Blinks and Actions using ephemeral reference keys.
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>Token: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v</span>
              <span className="text-primary font-bold">0% Protocol Fee</span>
            </div>
          </div>

          {/* Cupi Handle */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-primary uppercase">Cupi Handle</span>
              <p className="font-bold text-sm">{username ? `@${username}` : "@user"}</p>
            </div>
            <button 
              onClick={() => {
                const base = typeof window !== "undefined" ? window.location.origin : "https://cupi.shikhar.xyz";
                handleCopy(`${base}/${username || walletAddress}`, "Payment URL");
              }}
              className="text-xs btn-primary py-1.5 px-3 flex items-center gap-1"
            >
              {copied === "Payment URL" ? <Check size={14} /> : <Copy size={14} />} Share Link
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-4">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. LANGUAGE & REGION MODAL
// ==========================================
export function LanguageRegionModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const savedCurrency = localStorage.getItem("cupi_currency");
    const savedLang = localStorage.getItem("cupi_lang");
    if (savedCurrency) setCurrency(savedCurrency);
    if (savedLang) setLanguage(savedLang);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem("cupi_currency", currency);
    localStorage.setItem("cupi_lang", language);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("currency_changed"));
    }
    toast.success("Preferences updated successfully!");
    onClose();
  };

  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar (Default)" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "SOL", symbol: "◎", name: "Solana Native" }
  ];

  const languages = [
    { code: "en", name: "English (US)" },
    { code: "es", name: "Español" },
    { code: "hi", name: "हिन्दी (Hindi)" },
    { code: "fr", name: "Français" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Language & Region</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Display Currency</label>
            <div className="grid grid-cols-1 gap-2">
              {currencies.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-all ${
                    currency === c.code 
                      ? "border-primary bg-primary/10 text-primary font-bold" 
                      : "border-border bg-secondary/20 hover:bg-secondary/40 text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">{c.symbol}</span>
                    {c.name}
                  </span>
                  {currency === c.code && <CheckCircle2 size={16} className="text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interface Language</label>
            <div className="grid grid-cols-2 gap-2">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    language === l.code 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border bg-secondary/20 hover:bg-secondary/40 text-foreground"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold hover:bg-secondary rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-xs py-2 px-5">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. PRIVACY & SECURITY MODAL
// ==========================================
export function PrivacySecurityModal({
  isOpen,
  onClose,
  walletAddress,
  onExportKeys
}: {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onExportKeys: () => void;
}) {
  const [incognitoMode, setIncognitoMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cupi_incognito");
    if (saved) setIncognitoMode(JSON.parse(saved));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleIncognito = () => {
    const next = !incognitoMode;
    setIncognitoMode(next);
    localStorage.setItem("cupi_incognito", JSON.stringify(next));
    toast.success(next ? "Incognito link privacy enabled" : "Standard privacy restored");
  };

  const clearAppCache = () => {
    sessionStorage.clear();
    toast.success("Local session cache cleared!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Privacy & Security</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Key Custody Card */}
          <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Architecture</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">NON-CUSTODIAL</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your wallet uses Shamir secret sharing and MPC encryption via Privy. Neither Cupi nor any centralized server holds your private keys.
            </p>
            <button
              onClick={() => {
                onClose();
                onExportKeys();
              }}
              className="w-full mt-2 py-2 px-3 border border-border rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
            >
              <Key size={14} className="text-primary" /> Export Self-Custody Private Key
            </button>
          </div>

          {/* Client-Side Escrow Privacy */}
          <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client-Side Link Cryptography</span>
            <p className="text-xs text-muted-foreground">
              Payment links use secp256k1 ephemeral keypairs. The private claim key resides solely in the URL hash fragment (<code className="text-primary font-mono">#key=...</code>) and is never transmitted to our servers.
            </p>
          </div>

          {/* Privacy Toggle */}
          <div 
            onClick={toggleIncognito}
            className="p-4 bg-secondary/20 border border-border rounded-xl flex items-center justify-between cursor-pointer hover:bg-secondary/40 transition-colors"
          >
            <div>
              <h4 className="text-xs font-bold">Zero-Footprint Links</h4>
              <p className="text-[11px] text-muted-foreground">Strip sender metadata from recipient payment screens</p>
            </div>
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${incognitoMode ? 'bg-primary' : 'bg-secondary'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${incognitoMode ? 'translate-x-4' : 'translate-x-1'}`} />
            </div>
          </div>

          {/* Clear Cache */}
          <button
            onClick={clearAppCache}
            className="w-full py-2.5 px-3 border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 size={14} /> Clear Local Session Cache
          </button>
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-4">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. DEVELOPER SETTINGS MODAL
// ==========================================
export function DeveloperSettingsModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthStatus(data);
      toast.success("Health ping successful: 200 OK");
    } catch (err: any) {
      toast.error(`Health ping failed: ${err.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) checkHealth();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Developer & Diagnostics</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Health Status Card */}
          <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Postgres & Core API</span>
              <button 
                onClick={checkHealth}
                disabled={isChecking}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} /> Ping
              </button>
            </div>
            {healthStatus ? (
              <div className="font-mono text-xs space-y-1 bg-background/50 p-3 rounded-lg border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-green-500 font-bold">{healthStatus.status?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Database:</span>
                  <span className="text-green-500 font-bold">{healthStatus.database}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Users:</span>
                  <span>{healthStatus.counts?.users ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span>{healthStatus.uptimeSeconds}s</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Pinging /api/health...</p>
            )}
          </div>

          {/* Endpoints Matrix */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Production Endpoints</span>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="p-2.5 bg-secondary/20 rounded-lg border border-border flex justify-between items-center">
                <span>GET /actions.json</span>
                <span className="text-teal-400 font-bold">Actions v2</span>
              </div>
              <div className="p-2.5 bg-secondary/20 rounded-lg border border-border flex justify-between items-center">
                <span>POST /api/solana/pay</span>
                <span className="text-teal-400 font-bold">SPL Pay</span>
              </div>
              <div className="p-2.5 bg-secondary/20 rounded-lg border border-border flex justify-between items-center">
                <span>GET /api/resolve?identifier=...</span>
                <span className="text-primary font-bold">Directory</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. HELP & SUPPORT MODAL
// ==========================================
export function HelpSupportModal({
  isOpen,
  onClose,
  walletAddress
}: {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}) {
  if (!isOpen) return null;

  const copyDiagnostics = () => {
    const diag = JSON.stringify({
      wallet: walletAddress,
      origin: window.location.origin,
      ua: navigator.userAgent,
      time: new Date().toISOString()
    }, null, 2);
    navigator.clipboard.writeText(diag);
    toast.success("Diagnostics copied to clipboard!");
  };

  const faqs = [
    {
      q: "How does Solana Pay work in Cupi?",
      a: "Cupi generates an interactive QR or Blink. Senders approve the transaction natively in Phantom, Solflare, or Backpack without custody intermediaries."
    },
    {
      q: "What if the claim link expires?",
      a: "Expired or unclaimed funds are safely returned or revocable by the link creator back to their wallet."
    },
    {
      q: "Are transactions gas-free?",
      a: "Yes! Cupi sponsors ERC-4337 UserOperations on Base, and Solana transactions cost fractions of a cent ($0.0002)."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Help & Support</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Quick FAQ */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequently Asked Questions</h3>
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-3 bg-secondary/30 rounded-xl border border-border space-y-1">
                <h4 className="text-xs font-bold text-foreground">{faq.q}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Contact Direct */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Direct Assistance</h3>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="https://t.me/cupipay"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-secondary/30 border border-border rounded-xl text-xs font-bold text-center hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={14} className="text-blue-600" /> Telegram Chat
              </a>
              <a
                href="mailto:support@cupi.app"
                className="p-3 bg-secondary/30 border border-border rounded-xl text-xs font-bold text-center hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle size={14} className="text-primary" /> Email Support
              </a>
            </div>
          </div>

          {/* Diagnostic Dump */}
          <button
            onClick={copyDiagnostics}
            className="w-full py-2.5 px-3 border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
          >
            <Copy size={14} /> Copy Debug Diagnostics
          </button>
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-4">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. LEGAL MODAL (Terms & Privacy)
// ==========================================
export function LegalModal({
  isOpen,
  onClose,
  initialTab = "terms"
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "terms" | "privacy";
}) {
  const [tab, setTab] = useState<"terms" | "privacy">(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("terms")}
              className={`text-sm font-bold pb-1 border-b-2 transition-all ${
                tab === "terms" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              Terms of Service
            </button>
            <button
              onClick={() => setTab("privacy")}
              className={`text-sm font-bold pb-1 border-b-2 transition-all ${
                tab === "privacy" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              Privacy Policy
            </button>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto text-xs text-muted-foreground leading-relaxed">
          {tab === "terms" ? (
            <>
              <h3 className="text-sm font-bold text-foreground">1. Non-Custodial Protocol</h3>
              <p>
                Cupi is a non-custodial software application that interfaces directly with decentralized blockchain networks (including Solana and Ethereum/EVM Layer-2s). Cupi does not hold, take custody of, or broker user funds at any time.
              </p>

              <h3 className="text-sm font-bold text-foreground">2. Assumption of Risk</h3>
              <p>
                Blockchain transactions are irreversible. You are solely responsible for verifying the accuracy of recipient addresses, network gas conditions, and link claims. Cupi is not liable for transactions sent to incorrect addresses or lost private keys.
              </p>

              <h3 className="text-sm font-bold text-foreground">3. Escrow and Link Claiming</h3>
              <p>
                Funds held in escrow links are governed by public smart contracts and client-side cryptographic hashes. Cupi cannot bypass these contracts to seize, redirect, or alter unverified claim transactions.
              </p>

              <h3 className="text-sm font-bold text-foreground">4. Compliance & Prohibited Use</h3>
              <p>
                You agree not to use the service for money laundering, terrorism financing, sanctions evasion, or unlawful activities under your relevant jurisdiction.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-foreground">1. Zero Private Key Collection</h3>
              <p>
                Cupi never collects, stores, or transmits your private keys or seed phrases. Embedded wallets are managed via client-side MPC infrastructure provided by Privy.
              </p>

              <h3 className="text-sm font-bold text-foreground">2. Client-Side Hash Fragment Privacy</h3>
              <p>
                Secret keys generated for payment links reside in the URL fragment identifier (<code className="text-primary">#key=...</code>). By design of the HTTP/1.1 and HTTP/2 standards, fragment identifiers are not sent across the internet to Cupi servers.
              </p>

              <h3 className="text-sm font-bold text-foreground">3. Public Ledger Transparency</h3>
              <p>
                Transactions settled on Solana and EVM blockchains are publicly visible on distributed ledgers. Cupi displays public explorer references for accountability.
              </p>

              <h3 className="text-sm font-bold text-foreground">4. Data Deletion</h3>
              <p>
                You may request deletion of off-chain profile data (username, bio) by clearing your profile or contacting support.
              </p>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-5">
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 7. REWARDS & BADGES MODAL
// ==========================================
export function RewardsModal({
  isOpen,
  onClose,
  points = 250,
  username
}: {
  isOpen: boolean;
  onClose: () => void;
  points?: number | string;
  username?: string | null;
}) {
  if (!isOpen) return null;

  const copyReferral = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://cupi.shikhar.xyz";
    const refUrl = `${base}/?ref=${username || "cupi"}`;
    navigator.clipboard.writeText(refUrl);
    toast.success("Referral link copied!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            <h2 className="text-lg font-bold">Points & Rewards</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 rounded-2xl text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Balance</span>
            <div className="text-4xl font-black text-primary">{points} PTS</div>
            <span className="text-xs bg-primary/20 text-primary px-2.5 py-1 rounded-full font-bold">Tier: Silver Pioneer</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Earn More Points</h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold">Create a Solana Pay Blink</p>
                  <p className="text-muted-foreground text-[11px]">+50 pts per shared link</p>
                </div>
                <span className="text-green-500 font-bold">+50</span>
              </div>
              <div className="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold">Invite a Peer</p>
                  <p className="text-muted-foreground text-[11px]">When they claim their first link</p>
                </div>
                <span className="text-green-500 font-bold">+100</span>
              </div>
            </div>
          </div>

          <button
            onClick={copyReferral}
            className="w-full btn-primary py-2.5 px-4 text-xs flex items-center justify-center gap-2"
          >
            <Copy size={14} /> Copy Invite Link
          </button>
        </div>

        <div className="p-4 border-t border-border bg-secondary/10 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold hover:bg-secondary rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
