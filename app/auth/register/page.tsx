"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlobAnimation } from "@/components/ui/blob-animation";
import { motion } from "framer-motion";
import { SignUp } from "@clerk/nextjs";
import { FcGoogle } from "react-icons/fc";

const inputClassName = "block w-[calc(100%-2.5rem)] mx-auto px-4 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
const submitButtonClassName = "block w-[calc(100%-2.5rem)] mx-auto py-2.5 px-4 text-sm text-center font-medium rounded-xl transition-all bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        router.push("/auth/login?registered=true");
      } else {
        const data = await response.json();
        setError(data.message || "회원가입 중 오류가 발생했습니다.");
      }
    } catch (error) {
      setError("회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Google 로그인 구현
    try {
      window.location.href = "/api/auth/oauth/google";
    } catch (error) {
      console.error("Google 로그인 중 오류 발생:", error);
      setError("Google 로그인 중 오류가 발생했습니다.");
    }
  };

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
              Create Account
            </h2>
            <p className="text-gray-500 mt-2">새로운 계정을 만들어보세요</p>
          </div>

          <SignUp 
            path="/auth/register"
            routing="path"
            signInUrl="/auth/register"
            redirectUrl="/"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "bg-transparent shadow-none",
                formButtonPrimary: submitButtonClassName,
                socialButtonsBlockButton: "h-12 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 flex items-center justify-center gap-3 transition-all duration-200",
                formFieldLabel: "block text-sm font-medium text-gray-700 mb-1",
                formFieldInput: inputClassName,
                dividerText: "px-4 text-gray-500 bg-white",
                formFieldErrorText: "text-red-500 text-sm"
              }
            }}
          />

          <div className="w-[calc(100%-3rem)] mx-auto block mt-8">
            <p className="text-center text-gray-600">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 