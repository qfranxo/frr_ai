"use client";

import { SignUp } from "@clerk/nextjs";
import React from "react";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      <div className="w-full max-w-md">
        <SignUp fallbackRedirectUrl="/" />
      </div>
    </div>
  );
} 