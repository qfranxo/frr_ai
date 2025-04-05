"use client";

import { useState, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown } from "lucide-react";

// 추천 프롬프트 예시
const PROMPT_EXAMPLES = [
  {
    id: 'business',
    text: "Professional Business Look",
    icon: "💼",
    description: "Confident businessman, professional 30s woman, formal attire"
  },
  {
    id: 'casual',
    text: "Casual Everyday Model",
    icon: "👔",
    description: "Natural smile, men in their 20s, casual daily wear"
  },
  {
    id: 'sports',
    text: "Active Sports Model",
    icon: "🏃",
    description: "Natural smile, men in their 20s, casual daily wear"
  },
  {
    id: 'luxury',
    text: "Luxury Fashion Model",
    icon: "✨",
    description: "Sophisticated atmosphere, stylish women in their 30s, high-end fashion"
  }
];

// 프롬프트 예시 컴포넌트 메모이제이션
const PromptExample = memo(({ example, onClick }: { 
  example: typeof PROMPT_EXAMPLES[0], 
  onClick: (text: string) => void 
}) => (
  <button
    key={example.id}
    type="button"
    onClick={() => onClick(example.text)}
    className="p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 transition-all text-left"
  >
    <span className="text-2xl mb-2 block">{example.icon}</span>
    <span className="font-medium block mb-1">{example.text}</span>
    <span className="text-xs text-gray-500">{example.description}</span>
  </button>
));

PromptExample.displayName = 'PromptExample';

export const SearchSection = () => {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [showExamples, setShowExamples] = useState(false);

  // 핸들러 함수 메모이제이션
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
    }
  }, [prompt, router]);

  const handleExampleClick = useCallback((example: string) => {
    setPrompt(example);
    setShowExamples(false);
  }, []);

  const toggleExamples = useCallback(() => {
    setShowExamples(prev => !prev);
  }, []);

  // 애니메이션 가벼운 변형 사용
  const panelVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: 'auto', opacity: 1 }
  };

  return (
    <div className="w-full max-w-2xl mx-auto -mt-28 relative z-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-6 relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the advertising model you want in detail..."
                className="w-[calc(100%-4rem)] mx-auto h-32 rounded-2xl border-2 border-blue-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white/60 resize-none p-4 text-left placeholder:text-gray-400 block"
              />
              
              {/* 예시 토글 버튼 */}
              <button
                type="button"
                onClick={toggleExamples}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-3 shadow-lg border border-gray-100 z-10 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                    showExamples ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* 예시 프롬프트 패널 - 최적화된 애니메이션 */}
            <motion.div
              initial="hidden"
              animate={showExamples ? "visible" : "hidden"}
              variants={panelVariants}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="overflow-hidden px-6"
            >
              <div className="pt-6 space-y-4">
                <p className="text-sm font-medium text-gray-500">Recommended Prompts</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROMPT_EXAMPLES.map((example) => (
                    <PromptExample 
                      key={example.id} 
                      example={example} 
                      onClick={handleExampleClick} 
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* 생성 버튼 */}
            <div className="p-6">
              <Button
                type="submit"
                disabled={!prompt.trim()}
                className="w-[calc(100%-3rem)] mx-auto block h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl flex items-center justify-center gap-4 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
              >
                <Sparkles className="w-5 h-5" />
                <span className="ml-1">Generate AI Model</span>
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}; 