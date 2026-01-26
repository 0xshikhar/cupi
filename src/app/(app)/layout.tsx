import React from "react";
import ClientLayout from "@/app/client-layout";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
