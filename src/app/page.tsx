"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { Navbar } from '@/components/landing/layout/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProductShowcase } from '@/components/landing/ProductShowcase';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { SocialProof } from '@/components/landing/SocialProof';
import { ProductFeatures } from '@/components/landing/ProductFeatures';
import { FAQ } from '@/components/landing/FAQ';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/layout/Footer';
import { Toaster } from '@/components/ui/sonner';

export default function HomePage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();

  // Redirect authenticated users to /home
  useEffect(() => {
    if (ready && authenticated) {
      console.log('[LANDING PAGE] Redirecting authenticated user to /home');
      router.push('/home');
    }
  }, [ready, authenticated, router]);

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-white dark:bg-brand-dark selection:bg-brand-green selection:text-black font-sans">
      <Navbar />
      <main>
        <HeroSection />
        <ProductShowcase />
        <FeatureGrid />
        <SocialProof />
        <ProductFeatures />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
      <Toaster richColors position="top-center" />
    </div>
  );
}