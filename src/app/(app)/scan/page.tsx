"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, Image as ImageIcon, Zap, QrCode } from "lucide-react";
import jsQR from "jsqr";
import { QRCodeSVG } from "qrcode.react";
import { useAuthWallet } from "@/modules/wallet/hooks/useAuthWallet";
import { getUserProfile } from "@/app/actions/user";

export default function ScanPage() {
    const router = useRouter();
    const { userWalletAddress } = useAuthWallet();
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [scannedResult, setScannedResult] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraStarted, setCameraStarted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (userWalletAddress) {
                try {
                    const result = await getUserProfile(userWalletAddress);
                    if (result.user) {
                        setProfile(result.user);
                    }
                } catch (error) {
                    console.error("Failed to fetch profile:", error);
                }
            }
        };
        fetchProfile();
    }, [userWalletAddress]);

    // Start camera function (user-triggered)
    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
            setStream(mediaStream);
            setCameraStarted(true);
            setIsScanning(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    requestAnimationFrame(tick);
                };
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Camera access denied or unavailable. Please check your browser settings.");
            setCameraStarted(false);
            setIsScanning(false);
        }
    };

    // Cleanup camera stream
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Continuous scanning loop
    const tick = () => {
        if (!videoRef.current || !canvasRef.current) return;

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            if (!context) return;

            canvas.height = videoRef.current.videoHeight;
            canvas.width = videoRef.current.videoWidth;
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                handleScan(code.data);
            } else if (isScanning) {
                requestAnimationFrame(tick);
            }
        } else {
            requestAnimationFrame(tick);
        }
    };

    const handleScan = (data: string) => {
        if (!data) return;
        setScannedResult(data);
        setIsScanning(false);
        // Here you would navigate or process the data
        // For now, we just verify it works
        alert(`Scanned: ${data}`);
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

                if (code) {
                    handleScan(code.data);
                } else {
                    setError("No QR code found in image.");
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col text-white">
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera View */}
            <div className="relative flex-1 bg-black overflow-hidden flex flex-col">
                {cameraStarted ? (
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        playsInline
                        muted
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                        <button
                            onClick={startCamera}
                            className="flex flex-col items-center gap-4 p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 hover:bg-white/20 transition-all"
                        >
                            <Camera size={48} className="text-[#00FF95]" />
                            <span className="text-white font-bold text-lg">Start Scanning</span>
                        </button>
                    </div>
                )}

                {/* Overlays */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 z-10">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                        <button onClick={() => router.back()} className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20">
                            <X size={24} />
                        </button>
                        <h1 className="text-xl font-bold tracking-wide">Scan & Pay</h1>
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20">
                            <ImageIcon size={24} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                    </div>

                    {/* Scanner Guide */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="relative w-72 h-72">
                            <div className="absolute inset-0 border-[3px] border-[#00FF95] rounded-[30px] opacity-100 shadow-[0_0_30px_rgba(0,255,149,0.3)] animate-pulse"></div>
                            {/* Scanning line animation */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[#00FF95] shadow-[0_0_20px_#00FF95] animate-scan-line"></div>

                            {error && (
                                <div className="absolute -bottom-20 left-0 right-0 text-center bg-red-500/80 p-3 rounded-xl text-sm font-bold backdrop-blur-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Status */}
                    <div className="flex justify-center pb-8">
                        <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                            <Zap size={16} className="text-[#00FF95] fill-[#00FF95]" />
                            <span className="text-xs font-bold tracking-wider">SUPPORTS UPI & CRYPTO</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sheet - My QR */}
            <div className="bg-white text-black rounded-t-[30px] p-6 pb-12 flex flex-col items-center gap-6 relative -mt-6 z-20">
                <div className="w-12 h-1 bg-gray-300 rounded-full mb-2"></div>

                <div className="flex items-center gap-2 mb-2">
                    <QrCode size={20} />
                    <h2 className="font-bold text-lg">My Code</h2>
                </div>

                {userWalletAddress ? (
                    <>
                        <div className="p-4 border border-gray-200 rounded-2xl bg-white shadow-sm">
                            <QRCodeSVG
                                value={`https://cupi.vercel.app/${userWalletAddress}`}
                                size={160}
                                level="H"
                                includeMargin={true}
                            />
                        </div>

                        <p className="text-xs text-center text-gray-400 font-mono">
                            {profile?.username ? `@${profile.username}` : userWalletAddress.slice(0, 6)} • {userWalletAddress.slice(0, 6)}...{userWalletAddress.slice(-4)}
                        </p>
                    </>
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-sm text-gray-400">Connect wallet to view your QR code</p>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes scan-line {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
            `}</style>
        </div>
    );
}
