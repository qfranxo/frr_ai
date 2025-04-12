"use client";

import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <SignUp 
      path="/auth/register/[[...sign-up]]"
      signInUrl="/auth/login"
      redirectUrl="/"
    />
  );
} 