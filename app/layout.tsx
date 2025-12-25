import type { Metadata, Viewport } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  variable: "--font-share-tech-mono",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "cupi Dashboard",
  description: "Advanced financial analytics platform for modern investors",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any", type: "image/png" },
      { url: "/logo.png", sizes: "any" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8257e6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${orbitron.variable} ${shareTechMono.variable}`}>
      <body className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
