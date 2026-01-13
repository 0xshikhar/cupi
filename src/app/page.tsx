"use client";

import React from 'react';
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
  // Show landing page - no auto-redirect
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