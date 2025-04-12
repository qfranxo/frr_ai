'use client';

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <SignIn 
      path="/auth/login/[[...sign-in]]"
      signUpUrl="/auth/register"
      redirectUrl="/"
    />
  );
} 