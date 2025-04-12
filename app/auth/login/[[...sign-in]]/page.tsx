"use client";

import Link from "next/link";
import { BlobAnimation } from "@/components/ui/blob-animation";
import { motion } from "framer-motion";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <BlobAnimation />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[calc(100%-2.5rem)] max-w-md mx-auto z-10"
      >
        <div className="bg-white/70 backdrop-blur-xl p-4 rounded-3xl shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              로그인
            </h2>
            <p className="text-gray-500 mt-2">환영합니다! 계정에 로그인하세요</p>
          </div>
          
          <SignIn 
            path="/auth/login"
            routing="path"
            signUpUrl="/auth/register"
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                formFieldInput: "rounded-xl border-gray-300"
              },
              variables: {
                colorPrimary: "#2563eb"
              }
            }}
          />

          <div className="w-[calc(100%-3rem)] mx-auto block mt-8">
            <p className="text-center text-gray-600">
              계정이 없으신가요?{" "}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 