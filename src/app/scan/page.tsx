"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScanPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col h-full bg-background px-4 pt-4 pb-safe-bottom">
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                    <ArrowLeft size={24} />
                </Button>
                <h1 className="text-xl font-bold ml-2">Scan QR</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center -mt-20 gap-4">
                <div className="w-64 h-64 bg-black/5 rounded-3xl flex items-center justify-center border-2 border-dashed border-primary/30 relative overflow-hidden">
                    <ScanLine size={48} className="text-primary animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-scan" />
                </div>
                <p className="text-muted-foreground text-sm">
                    Point camera at a Cupi QR code
                </p>
            </div>
        </div>
    );
}
