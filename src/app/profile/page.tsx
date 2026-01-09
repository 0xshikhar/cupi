"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePrivy } from "@privy-io/react-auth";
import { QrCode } from "lucide-react";

export default function ReceivePage() {
    const router = useRouter();
    const { user } = usePrivy();
    const address = user?.wallet?.address || "0xMyWalletAddress...";

    return (
        <div className="flex flex-col h-full bg-background px-4 pt-4 pb-safe-bottom">
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                    <ArrowLeft size={24} />
                </Button>
                <h1 className="text-xl font-bold ml-2">Receive</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-8 -mt-20">
                <Card className="p-8 flex flex-col items-center gap-6 shadow-xl border-0 bg-white rounded-3xl w-full max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary-foreground mb-[-10px]">
                        {user?.email?.address ? user.email.address[0].toUpperCase() : "U"}
                    </div>

                    <div className="text-center">
                        <h2 className="text-xl font-bold">{user?.email?.address || "User"}</h2>
                        <p className="text-sm text-muted-foreground mt-1 break-all px-4">
                            {address}
                        </p>
                    </div>

                    <div className="bg-white p-2 rounded-xl border-2 border-dashed border-primary/30">
                        {/* Placeholder for QR Code */}
                        <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-muted-foreground">
                            <QrCode size={64} className="opacity-20" />
                        </div>
                    </div>

                    <div className="flex gap-3 w-full">
                        <Button className="flex-1 rounded-xl" variant="outline">
                            <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                        <Button className="flex-1 rounded-xl bg-primary text-primary-foreground">
                            <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
