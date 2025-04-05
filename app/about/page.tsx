"use client";

import React from 'react';
import { motion } from "framer-motion";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloneElement } from 'react';

// Motion 최적화 (필요시)
const OptimizedMotion = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

// 아이콘 지연 로딩 (필요시)
const SparkleIcon = dynamic(
  () => import('lucide-react').then((mod) => mod.Sparkles),
  { ssr: false }
);

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 히어로 섹션 */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* 배경 효과 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-b from-blue-100/20 to-transparent blur-3xl" />
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* 제목 컨테이너에 여백 추가 */}
            <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent [line-height:1.3] md:[line-height:1.2] px-1">
                Start Creating with Frr AI
              </h1>
            </div>
            
            {/* 서브텍스트에 여백과 line-height 조정 */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed py-2">
              Join thousands of creators who are already transforming their ideas into stunning visuals
            </p>
            
            {/* 특징 배지 */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-8 sm:mt-12">
              {[
                { icon: "🎨", text: "Advanced AI Models" },
                { icon: "⚡", text: "Real-time Generation" },
                { icon: "🔄", text: "Unlimited Edits" },
              ].map((badge) => (
                <div
                  key={badge.text}
                  className="flex items-center justify-start gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:shadow-md transition-all min-w-[180px] sm:min-w-[200px]"
                >
                  <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7">
                    <span className="text-lg sm:text-xl">{badge.icon}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{badge.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 핵심 가치 섹션 */}
      <section className="py-16 sm:py-24 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent [line-height:1.3] md:[line-height:1.2] px-1">
                Our Core Values
              </h2>
            </div>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: "🎨",
                title: "Intuitive Experience",
                description: "Create desired images with simple text input without complex settings."
              },
              {
                icon: "🚀",
                title: "Innovative Technology",
                description: "Generate high-quality images rapidly using cutting-edge AI technology"
              },
              {
                icon: "🤝",
                title: "Creator-Centric",
                description: "Provide an environment where creators inspire each other and grow together"
              }
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <span className="text-3xl sm:text-4xl mb-3 sm:mb-4 block">{item.icon}</span>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 커뮤니티 섹션 */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* 배경 효과 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 to-white" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-100/20 to-transparent rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent [line-height:1.3] md:[line-height:1.2] px-1">
                Creative Community
              </h2>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Join a vibrant community of creators and innovators
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: "🎨",
                title: "Share & Inspire",
                description: "Share your creations and get inspired by other artists"
              },
              {
                icon: "💡",
                title: "Learn & Grow",
                description: "Access tutorials, tips, and best practices from the community"
              },
              {
                icon: "🤝",
                title: "Collaborate",
                description: "Find collaborators and work on projects together"
              }
            ].map((item) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="group p-6 sm:p-8 bg-white/60 backdrop-blur-sm rounded-2xl hover:bg-white/80 transition-all duration-300 hover:shadow-xl"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl sm:text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="relative py-16 sm:py-24 overflow-hidden">
        {/* 배경 효과 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-white" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-purple-100/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-t from-blue-100/20 to-transparent rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent [line-height:1.3] md:[line-height:1.2] px-1">
                  Ready to Get Started?
                </h2>
              </div>
              <p className="text-base sm:text-lg md:text-xl text-gray-600">
                Join thousands of creators who are already transforming their ideas into stunning visuals
              </p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-md">
              <SignInButton mode="modal">
                <Button className="w-full h-9 sm:h-12 px-0 sm:px-8 text-xs sm:text-base font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  Start Creating
                </Button>
              </SignInButton>
              <Link href="/pricing" className="w-full">
                <Button variant="outline" className="w-full h-9 sm:h-12 px-0 sm:px-8 text-xs sm:text-base font-medium border-2 border-gray-200 hover:border-purple-200 text-gray-700 hover:text-purple-700 rounded-xl hover:bg-purple-50/50 transition-all duration-300">
                  Explore Plans
                </Button>
              </Link>
            </div>

            {/* 하이라이트 섹션 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-3xl mt-8 sm:mt-12">
              {[
                { 
                  icon: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />, 
                  text: "Free Trial", 
                  subtext: "No Credit Card Required" 
                },
                { 
                  icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />, 
                  text: "High Quality", 
                  subtext: "Premium AI Generation" 
                },
                { 
                  icon: <Clock className="w-4 h-4 sm:w-5 sm:h-5" />, 
                  text: "Quick Start", 
                  subtext: "Start in 1 Minute" 
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center p-4 sm:p-6 bg-white/60 backdrop-blur-sm rounded-2xl hover:bg-white/80 transition-all duration-300"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2 sm:mb-3">
                    {cloneElement(item.icon, { className: "w-4 h-4 sm:w-5 sm:h-5 text-blue-600" })}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">{item.text}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{item.subtext}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 