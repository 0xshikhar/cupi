"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Zap,
  QrCode,
  Copy,
  Check,
  Share2,
  Flashlight,
  Clipboard,
  ShieldCheck,
  ArrowRight,
  User,
  Sparkles,
  Smartphone,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import jsQR from "jsqr";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { getUserProfile } from "@/app/actions/user";

export default function ScanPage() {
  const router = useRouter();
  const { userWalletAddress, basicWalletAddress } = useAuthWallet();

  // Active view tab: "scan" | "receive"
  const [activeTab, setActiveTab] = useState<"scan" | "receive">("scan");

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual input fallback
  const [manualInput, setManualInput] = useState("");

  // Receive Tab: User Profile & Dynamic Amount
  const [profile, setProfile] = useState<any>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Fetch profile for Receive tab
  useEffect(() => {
    const fetchProfile = async () => {
      if (userWalletAddress) {
        try {
          const result = await getUserProfile(userWalletAddress);
          if (result.user) {
            setProfile(result.user);
          }
        } catch (err) {
          console.warn("[SCAN] Failed to fetch profile:", err);
        }
      }
    };
    fetchProfile();
  }, [userWalletAddress]);

  // Keep isScanningRef in sync
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  // Attach active stream to video element whenever stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current
        .play()
        .then(() => {
          setIsScanning(true);
          isScanningRef.current = true;
          requestAnimationFrame(tick);
        })
        .catch((err) => {
          console.warn("[SCAN] Video play failed:", err);
        });
    }
  }, [stream]);

  // Camera permission state tracking
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const permissionStatusRef = useRef<PermissionStatus | null>(null);

  // Monitor browser permission changes (e.g. user toggles Camera switch in Chrome address bar)
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;

    let isMounted = true;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        if (!isMounted) return;
        permissionStatusRef.current = status;
        setPermissionState(status.state as any);

        const handlePermissionChange = () => {
          if (!isMounted) return;
          setPermissionState(status.state as any);
          if (status.state === "granted") {
            setError(null);
            // Automatically launch camera once permission is granted
            startCamera();
          }
        };

        status.addEventListener("change", handlePermissionChange);

        // If permission is already granted on initial load, auto-start camera
        if (status.state === "granted" && !cameraStarted && activeTab === "scan") {
          startCamera();
        }
      })
      .catch((err) => {
        console.warn("[SCAN] Camera permission query not supported:", err);
      });

    return () => {
      isMounted = false;
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [activeTab]);

  // Start camera with resilient fallback and clear error diagnostics
  const startCamera = async () => {
    try {
      setError(null);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported in this browser. Please use Chrome, Safari, or Brave.");
        return;
      }

      let mediaStream: MediaStream | null = null;
      const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // On mobile devices, prefer environment rear camera
      if (isMobile) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      } else {
        // On desktop/MacBook, direct video: true accesses webcam/FaceTime camera without constraint conflicts
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (desktopErr) {
          console.warn("[SCAN] Simple video constraint failed, attempting fallback:", desktopErr);
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          });
        }
      }

      if (!mediaStream) {
        throw new Error("No media stream returned by camera device.");
      }

      setStream(mediaStream);
      setCameraStarted(true);
      setError(null);
    } catch (err: any) {
      console.warn("[SCAN] Camera access error:", err);

      const msg = err?.message || "";
      const isSystemDenied =
        msg.toLowerCase().includes("system") ||
        msg.toLowerCase().includes("permission denied by system");

      const isPermissionAlreadyGranted = permissionStatusRef.current?.state === "granted";

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        if (isSystemDenied || isPermissionAlreadyGranted) {
          setError(
            "Camera is allowed in Chrome, but macOS is blocking Chrome from accessing the hardware.\n\n1. Open Mac System Settings → Privacy & Security → Camera\n2. Turn ON Google Chrome (or your browser)\n3. Reload this page."
          );
        } else {
          setError(
            "Camera permission was updated or blocked.\n\nIf you just toggled Camera to Allowed in your browser address bar, click 'Reload Page' below to apply changes to this tab."
          );
        }
      } else if (err?.name === "NotReadableError") {
        setError(
          "Camera is currently locked by another application (FaceTime, Zoom, or another browser tab). Please close other camera apps and retry."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setError("No camera device was detected on your machine. You can upload a QR image below.");
      } else if (err?.name === "OverconstrainedError") {
        setError("Your camera hardware does not support the requested video settings. Please try uploading a photo instead.");
      } else {
        setError(msg || "Camera access unavailable. You can upload a QR image or enter an address below.");
      }

      setCameraStarted(false);
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
    setIsScanning(false);
    isScanningRef.current = false;
    setTorchOn(false);
  };

  // Toggle Torch if device supports it
  const toggleTorch = async () => {
    if (!stream) return;
    try {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
      if (capabilities.torch) {
        const nextState = !torchOn;
        await (track as any).applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } else {
        toast.info("Flashlight not supported on this camera.");
      }
    } catch {
      toast.info("Flashlight unavailable.");
    }
  };

  // Cleanup on unmount or tab change
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Continuous scanning loop
  const tick = () => {
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      canvas.height = videoRef.current.videoHeight;
      canvas.width = videoRef.current.videoWidth;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        handleScan(code.data);
        return;
      }
    }

    if (isScanningRef.current) {
      requestAnimationFrame(tick);
    }
  };

  const handleScan = (data: string) => {
    if (!data) return;
    stopCamera();
    toast.success("QR Code recognized!");

    // 1. Direct Cupi Claim link
    if (data.includes("/claim/")) {
      try {
        const url = new URL(data);
        router.push(url.pathname + url.search + url.hash);
        return;
      } catch {
        if (data.startsWith("/claim/")) {
          router.push(data);
          return;
        }
      }
    }

    // 2. Solana Pay URL (solana:<recipient>?amount=...)
    if (data.startsWith("solana:")) {
      const cleanSolana = data.replace("solana:", "");
      const [recipient, query] = cleanSolana.split("?");
      router.push(`/send?recipient=${encodeURIComponent(recipient)}${query ? `&${query}` : ""}&rail=solana`);
      return;
    }

    // 3. UPI QR Code (upi://pay?pa=...)
    if (data.startsWith("upi://pay")) {
      try {
        const url = new URL(data);
        const pa = url.searchParams.get("pa");
        const am = url.searchParams.get("am");
        router.push(`/send?recipient=${encodeURIComponent(pa || data)}${am ? `&amount=${am}` : ""}&rail=upi`);
        return;
      } catch {
        router.push(`/send?recipient=${encodeURIComponent(data)}`);
        return;
      }
    }

    // 4. EVM URI (ethereum:0x...)
    if (data.startsWith("ethereum:")) {
      const cleanEth = data.replace("ethereum:", "").split("?")[0];
      router.push(`/send?recipient=${encodeURIComponent(cleanEth)}&rail=evm`);
      return;
    }

    // 5. Default address or username
    router.push(`/send?recipient=${encodeURIComponent(data)}`);
  };

  // Handle File Upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleScan(code.data);
        } else {
          setError("No QR code found in uploaded image. Please try another image.");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Clipboard Paste Helper
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualInput(text.trim());
        toast.success("Pasted address from clipboard");
      }
    } catch {
      toast.error("Clipboard permission required to paste");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScan(manualInput.trim());
  };

  // Receive QR payload derivation
  const rawAddress = userWalletAddress || basicWalletAddress || "";
  const dynamicPayUrl = typeof window !== "undefined"
    ? `${window.location.origin}/pay/${profile?.username ? `@${profile.username}` : rawAddress}${receiveAmount ? `?amount=${encodeURIComponent(receiveAmount)}` : ""}`
    : `https://cupi.app/${rawAddress}`;

  const copyPayLink = async () => {
    await navigator.clipboard.writeText(dynamicPayUrl);
    setCopiedLink(true);
    toast.success("Payment link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyAddress = async () => {
    if (!rawAddress) return;
    await navigator.clipboard.writeText(rawAddress);
    setCopiedAddress(true);
    toast.success("Wallet address copied!");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const shareReceiveLink = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Pay @${profile?.username || "me"} on cUPI`,
          text: receiveAmount ? `Pay me $${receiveAmount} on cUPI:` : "Send me money on cUPI:",
          url: dynamicPayUrl,
        });
      } catch (_err) {
        // User dismissed
      }
    } else {
      copyPayLink();
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-4 pt-2">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/home")}
          className="p-2.5 rounded-xl border border-border bg-secondary/30 hover:bg-secondary text-foreground transition-all flex items-center justify-center shadow-sm"
          title="Back to Dashboard"
        >
          <ArrowLeft size={18} />
        </button>

        <h1 className="text-xl font-black tracking-tight text-foreground">
          {activeTab === "scan" ? "Scan to Pay" : "My Payment QR"}
        </h1>

        <div className="w-10" />
      </div>

      {/* Segmented Mode Switcher */}
      <div className="flex rounded-2xl bg-secondary/40 p-1 border border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab("scan");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "scan"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera size={15} />
          Scan QR Code
        </button>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setActiveTab("receive");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === "receive"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode size={15} />
          My QR / Receive
        </button>
      </div>

      {/* TAB 1: SCANNER */}
      {activeTab === "scan" && (
        <div className="space-y-6">
          {/* Viewfinder Card */}
          <div className="cupi-card overflow-hidden rounded-3xl border border-border/80 p-6 space-y-6 text-foreground text-center shadow-lg relative">
            <div className="on-dark relative w-64 h-64 mx-auto rounded-3xl overflow-hidden bg-neutral-950 border border-white/10 flex items-center justify-center shadow-inner">
              {/* Always keep video mounted so videoRef is ready for stream assignment */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  cameraStarted ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
                }`}
                playsInline
                muted
                autoPlay
              />

              {cameraStarted ? (
                /* Active Laser Scanning Line */
                <div className="absolute inset-0 pointer-events-none z-20">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_#00FF95] animate-scan-line" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 space-y-3 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Camera size={30} className="text-primary" />
                  </div>
                  <button
                    onClick={startCamera}
                    className="btn-primary py-2.5 px-5 text-xs font-black tracking-wide rounded-xl shadow-md active:scale-95 transition-all text-black"
                  >
                    Start Camera
                  </button>
                  <p className="text-[11px] text-neutral-400">
                    Point the camera at a Solana Pay, cUPI or Web3 QR code
                  </p>
                </div>
              )}

              {/* Viewfinder Corner Brackets */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg pointer-events-none z-30" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg pointer-events-none z-30" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg pointer-events-none z-30" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg pointer-events-none z-30" />
            </div>

            {error && (
              <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-50 dark:bg-rose-950/50 text-left space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-800 dark:text-rose-200">
                    <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Camera Permission Notice</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-slate-900 dark:text-rose-100 whitespace-pre-line font-medium">
                  {error}
                </p>
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-rose-200 dark:border-rose-900/60 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">Why is there no prompt?</p>
                  <p>Chrome remembers previous permission for localhost. In the address bar popup, click <strong>Reset permissions</strong>, then click <strong>Reload Page</strong> to see the native prompt.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <RefreshCw size={13} />
                    Reload Page to Apply
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2 px-3.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-slate-900 dark:text-white font-semibold text-xs border border-border flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Camera size={13} />
                    Retry Camera
                  </button>
                </div>
              </div>
            )}

            {/* In-Viewfinder Camera Controls */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white border border-white/10 transition-all active:scale-95"
              >
                <ImageIcon size={14} />
                Upload Photo
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />

              {cameraStarted && (
                <>
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl border transition-all ${
                      torchOn
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                        : "bg-white/10 border-white/10 text-white hover:bg-white/15"
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Flashlight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-2 px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all hover:bg-rose-500/30"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>

            {/* Multi-Rail Format Pill */}
            <div className="pt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>UPI · Solana Pay · Base · cUPI Links</span>
            </div>
          </div>

          {/* Manual Input Fallback */}
          <div className="cupi-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Or Enter Address / Handle
              </label>
              <button
                type="button"
                onClick={handlePaste}
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Clipboard size={12} />
                Paste
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="@username, 0x..., or solana address"
                className="flex-1 rounded-xl border border-border bg-secondary/30 px-3.5 py-2.5 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="btn-primary px-4 py-2.5 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                Pay <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY QR / RECEIVE */}
      {activeTab === "receive" && (
        <div className="space-y-6">
          <div className="cupi-card p-6 sm:p-7 space-y-6 text-center shadow-sm">
            {/* User Profile Header */}
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/20 border border-primary/30 mx-auto flex items-center justify-center text-primary font-black text-xl">
                {profile?.username
                  ? profile.username.charAt(0).toUpperCase()
                  : rawAddress
                  ? rawAddress.slice(2, 4).toUpperCase()
                  : "U"}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">
                  {profile?.username ? `@${profile.username}` : "Your cUPI Account"}
                </h2>
                {rawAddress && (
                  <button
                    onClick={copyAddress}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono mt-0.5 transition-colors"
                    title="Click to copy address"
                  >
                    <span>
                      {rawAddress.slice(0, 6)}...{rawAddress.slice(-4)}
                    </span>
                    {copiedAddress ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            {/* High-Resolution QR Tile */}
            <div className="p-4 bg-white rounded-3xl mx-auto inline-block border border-neutral-200 shadow-md">
              <QRCodeSVG
                value={dynamicPayUrl}
                size={210}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Optional Amount Request */}
            <div className="space-y-2 pt-1 max-w-xs mx-auto">
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-muted-foreground select-none">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="Request specific amount (optional)"
                  className="w-full rounded-xl border border-border bg-secondary/30 pl-7 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-center placeholder:text-muted-foreground/60"
                />
              </div>
              {receiveAmount && (
                <p className="text-[11px] text-emerald-500 font-semibold">
                  QR updated to request ${receiveAmount} USDC
                </p>
              )}
            </div>

            {/* Share / Copy Action Bar */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={copyPayLink}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary text-xs font-bold transition-all shadow-sm"
              >
                {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copiedLink ? "Link Copied!" : "Copy Pay Link"}
              </button>

              <button
                type="button"
                onClick={shareReceiveLink}
                className="btn-primary flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all shadow-sm"
              >
                <Share2 size={14} />
                Share My QR
              </button>
            </div>

            {/* Security Footer */}
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Compatible with Phantom, Metamask, and cUPI Wallets</span>
            </div>
          </div>
        </div>
      )}

      {/* Laser Scanning Animation Style */}
      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: 10%;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            top: 90%;
            opacity: 0;
          }
        }
        .animate-scan-line {
          animation: scan-line 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
