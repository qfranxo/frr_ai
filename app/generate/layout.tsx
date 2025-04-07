import React from 'react';
import { Inter } from "next/font/google";
import Header from "@/components/layout/Header";
import GeistWrapper from "@/components/providers/GeistProvider";
import ToasterProvider from "@/components/providers/ToasterProvider";

const inter = Inter({ subsets: ["latin"] });

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      <GeistWrapper>
        <div className="min-h-screen flex flex-col relative z-10">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          {/* 푸터 제거됨 */}
        </div>
      </GeistWrapper>
      <ToasterProvider />
    </div>
  );
} 