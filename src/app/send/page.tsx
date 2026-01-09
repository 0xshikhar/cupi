"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePrivy } from "@privy-io/react-auth";
// import { api } from "@/trpc/react"; // TODO: Enable when tRPC is ready

export default function SendPage() {
    const router = useRouter();
    const { user } = usePrivy();
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreateLink = async () => {
        if (!amount || isNaN(Number(amount))) return;
        setLoading(true);

        // TODO: Call tRPC mutation to create payment link
        // const link = await createLink.mutateAsync({ amount, description });

        // Simulate delay
        setTimeout(() => {
            setLoading(false);
            // Navigate to success/share page with the link ID
            // router.push(`/send/share/${mockLinkId}`);
            alert(`Link created for $${amount}! (Mock)`);
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full bg-background px-4 pt-4 pb-safe-bottom">
            {/* Header */}
            <div className="flex items-center mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                    <ArrowLeft size={24} />
                </Button>
                <h1 className="text-xl font-bold ml-2">Send Money</h1>
            </div>

            {/* Amount Input */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                <div className="relative w-full max-w-[200px]">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-bold text-muted-foreground">$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent text-6xl font-bold text-center border-none outline-none focus:ring-0 placeholder:text-muted/30"
                        autoFocus
                    />
                </div>
                <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    <span>Updates balance instantly</span>
                </div>
            </div>

            {/* Details Form */}
            <div className="space-y-4 mb-8">
                <Input
                    placeholder="Add a note (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-12 bg-secondary/50 border-0 rounded-xl"
                />

                <Card className="p-4 border border-primary/20 bg-primary/5 rounded-xl">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/20 rounded-full text-primary-foreground">
                            <LinkIcon size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">Send via Link</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Share link on Whatsapp, iMessage, or Telegram.
                                Recipient doesn't need an account.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Action Button */}
            <Button
                size="lg"
                className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                onClick={handleCreateLink}
                disabled={!amount || loading}
            >
                {loading ? "Creating Link..." : "Create Link"}
            </Button>
        </div>
    );
}
