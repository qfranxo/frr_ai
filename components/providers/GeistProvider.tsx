"use client";

import { GeistProvider as Geist, CssBaseline } from '@geist-ui/react';

export default function GeistWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Geist>
      <CssBaseline />
      {children}
    </Geist>
  );
} 