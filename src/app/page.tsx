import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { ProductShowcase } from '@/components/home/ProductShowcase';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { SocialProof } from '@/components/home/SocialProof';
import { ProductFeatures } from '@/components/home/ProductFeatures';
import { FAQ } from '@/components/home/FAQ';
import { CTASection } from '@/components/home/CTASection';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
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