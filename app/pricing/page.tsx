"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from 'next/dynamic';
import { CheckCircle2, Sparkles, Clock, Check, X } from "lucide-react";
import { useUser, SignInButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const BILLING_PERIODS = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS];

interface PricingPlan {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: string[];
  highlighted?: boolean;
}

interface SubscriptionInfo {
  tier: 'free' | 'premium' | 'starter';
  maxGenerations: number;
  remaining: number;
  renewalDate: Date;
}

const TranslationComponent = dynamic(
  () => import('./TranslationComponent'),
  { ssr: false }
);

// Common button styles as constants to reduce duplication
const BUTTON_STYLES = {
  primary: "w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium text-base",
  secondary: "w-full py-3.5 px-6 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl font-medium text-base",
  disabled: "w-full py-3.5 px-6 bg-gray-200 text-gray-600 rounded-xl font-medium cursor-not-allowed text-base"
};

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(BILLING_PERIODS.MONTHLY);
  const [selectedPlan, setSelectedPlan] = useState<string>("Pro");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  
  const discount = 20; // 연간 결제 시 할인율 (%)
  
  const pricingPlans: PricingPlan[] = [
    {
      name: "Starter",
      price: {
        monthly: 0,
        yearly: 0,
      },
      description: "Experience the world of AI art",
      features: [
        "3 image generations/month",
        "Basic styles",
        "Community support",
      ],
    },
    {
      name: "Pro",
      price: {
        monthly: 9,
        yearly: 90,
      },
      description: "For professional creative work",
      features: [
        "100 image generations/month",
        "High-resolution output",
        "Priority generation",
        "All style options",
        "Commercial license",
        "Priority support"
      ],
      highlighted: true,
    },
    {
      name: "Team",
      price: {
        monthly: 29,
        yearly: 290,
      },
      description: "Collaboration features for teams",
      features: [
        "All Pro features",
        "Up to 5 team members",
        "Shared team gallery",
        "Collaboration tools",
        "API access",
        "Dedicated manager"
      ],
    },
  ];

  const faqs = [
    {
      question: "Who owns the copyright to generated images?",
      answer: "All generated images are owned by the creator. You can use them freely for commercial purposes."
    },
    {
      question: "How does the free trial work?",
      answer: "Get 1 free generation upon signup. Upgrade to a paid plan for additional generations."
    },
    {
      question: "Can I change plans anytime?",
      answer: "Yes, you can switch plans freely. When upgrading, we'll prorate the difference."
    },
    {
      question: "Do you offer enterprise plans?",
      answer: "Yes, we provide custom plans tailored to your needs. Contact our sales team for details."
    }
  ];

  const FAQSection = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
      <div className="relative mt-16 md:mt-24 max-w-3xl mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <span className="text-lg md:text-xl font-medium text-blue-600 mb-2 block">FAQ</span>
          <h2 className="text-2xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="grid gap-3 md:gap-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-4 md:p-6 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-lg md:text-xl">❓</span>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    {faq.question}
                  </h3>
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-4 md:px-6 pb-4 md:pb-6 flex items-start gap-2 md:gap-3">
                  <span className="text-lg md:text-xl mt-1">💡</span>
                  <p className="text-sm md:text-base text-gray-600 flex-1">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 구독 정보 가져오기
  useEffect(() => {
    if (isSignedIn) {
      fetchSubscriptionInfo();
    }
  }, [isSignedIn]);

  // 구독 정보 조회 함수
  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("구독 정보 조회 오류:", error);
    }
  };
  
  // Handle upgrade to Premium
  const handleUpgrade = async () => {
    if (!isSignedIn) {
      router.push('/auth/sign-in');
      return;
    }
    
    // 로딩 토스트 ID 저장
    const loadingToast = toast.loading("Upgrading subscription...");
    
    try {
      console.log("Starting subscription upgrade process...");
      
      // 실제 결제 시스템이 구현되면 여기에 결제 로직이 들어갑니다.
      // 현재는 API 호출만 수행합니다.
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 추가 데이터가 필요하면 여기에 body 추가
        // body: JSON.stringify({ plan: 'premium' }),
      });
      
      console.log("API response status:", response.status, response.statusText);
      
      // 응답 데이터 파싱
      const data = await response.json();
      console.log("API response data:", data);
      
      if (!response.ok) {
        // 서버에서 반환된 오류 메시지 사용
        throw new Error(data.error || `Failed to upgrade subscription: ${response.status} ${response.statusText}`);
      }
      
      // 응답이 성공적이면 구독 정보 업데이트
      setSubscription(data.subscription);
      console.log("Subscription successfully upgraded:", data.subscription);
      
      // 성공 토스트로 업데이트
      toast.success("Successfully upgraded to premium!");
    } catch (error) {
      console.error("Upgrade error:", error);
      // 에러 토스트로 업데이트
      toast.error(error instanceof Error ? error.message : "An error occurred during upgrade.");
    } finally {
      // 로딩 토스트 닫기
      toast.dismiss(loadingToast);
    }
  };

  // Helper function to render the appropriate button for each plan
  const renderPlanButton = (plan: PricingPlan) => {
    // Current plan (disabled state)
    if ((plan.name === "Starter" && isSignedIn) || 
        (plan.name === "Pro" && subscription?.tier === 'premium')) {
      return (
        <button
          disabled
          className={BUTTON_STYLES.disabled}
        >
          Current Plan
        </button>
      );
    }
    
    // Coming soon plan
    if (plan.name === "Team") {
      return (
        <Button
          disabled
          className={BUTTON_STYLES.secondary + " text-gray-400"}
        >
          Coming Soon
        </Button>
      );
    }
    
    // Free plan logic
    if (plan.name === "Starter") {
      if (isSignedIn) {
        // 이 조건은 위에서 이미 처리됐으므로 실행되지 않습니다
        return (
          <Button
            disabled
            className={BUTTON_STYLES.disabled}
          >
            Current Plan
          </Button>
        );
      } else {
        return (
          <SignInButton mode="modal">
            <Button className={BUTTON_STYLES.secondary}>
              Get Started
            </Button>
          </SignInButton>
        );
      }
    }
    
    // Paid plan logic
    return isSignedIn ? (
      <Button
        onClick={handleUpgrade}
        className={BUTTON_STYLES.primary}
      >
        Upgrade
      </Button>
    ) : (
      <SignInButton mode="modal">
        <Button className={BUTTON_STYLES.primary}>
          Get Started
        </Button>
      </SignInButton>
    );
  };

  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/90 via-blue-50/90 to-white" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-b from-purple-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-blue-100/20 to-transparent rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-16"
        >
          <div className="space-y-6 md:space-y-8 mb-4 md:mb-8">
            <h1 className="text-3xl md:text-5xl lg:text-5.5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent [line-height:1.3] md:[line-height:1.2] px-1">
              Simple & Transparent Pricing
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your creative journey
          </p>
        </motion.div>

        <div className="flex justify-center mb-10 md:mb-16">
          <div className="bg-white rounded-full p-1 shadow-md">
            <div className="flex items-center relative min-w-[200px]">
              <button
                onClick={() => setBillingPeriod(BILLING_PERIODS.MONTHLY)}
                className={`flex-1 px-4 py-1.5 rounded-full transition-all duration-200 relative z-10 text-center text-sm
                  ${billingPeriod === BILLING_PERIODS.MONTHLY ? 'text-white' : 'text-gray-600'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod(BILLING_PERIODS.YEARLY)}
                className={`flex-1 px-4 py-1.5 rounded-full transition-all duration-200 relative z-10 text-center text-sm
                  ${billingPeriod === BILLING_PERIODS.YEARLY ? 'text-white' : 'text-gray-600'}`}
              >
                Yearly
              </button>
              <div
                className={`absolute top-0 bottom-0 w-[50%] rounded-full bg-blue-500 transition-all duration-200
                  ${billingPeriod === BILLING_PERIODS.YEARLY ? 'translate-x-full' : 'translate-x-0'}`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 mt-8 mb-8 md:mt-16 md:mb-16">
          {pricingPlans.map((plan, index) => (
            <div key={plan.name} className="flex justify-center px-2 sm:px-4 mb-6 md:mb-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-lg  
                  hover:shadow-xl transition-all duration-300 flex flex-col 
                  border-2 border-transparent
                  ${selectedPlan === plan.name 
                    ? 'ring-2 ring-blue-500 border-blue-500' 
                    : 'hover:border-blue-200'
                  }`}
                style={{ 
                  width: '100%',
                  height: 'auto',
                  minHeight: '500px',
                  maxWidth: '320px'
                }}
                onClick={() => setSelectedPlan(plan.name)}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 md:px-6 py-1.5 
                      rounded-full text-sm whitespace-nowrap shadow-lg animate-pulse-slow">
                      Popular Plan
                    </span>
                  </div>
                )}
                <div className="text-center mb-5 md:mb-6">
                  <h3 className={`text-xl font-bold mb-2 transition-colors duration-300
                    ${selectedPlan === plan.name 
                      ? 'text-blue-600'
                      : 'text-gray-900'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p className="w-full p-0 text-sm bg-transparent border-none text-gray-600 placeholder:text-gray-400 min-h-[40px]">
                    {plan.description}
                  </p>
                  <div className="text-3xl font-bold mb-2">
                    <span className={`${selectedPlan === plan.name ? 'text-blue-600' : 'text-gray-900'}`}>
                      {plan.name === "Starter" ? (
                        <>$0</>
                      ) : (
                        <>
                          ${(billingPeriod === BILLING_PERIODS.YEARLY 
                            ? Math.floor(plan.price.yearly / 12) 
                            : plan.price.monthly)}
                        </>
                      )}
                    </span>
                    <span className="text-sm font-normal text-gray-600">/mo</span>
                  </div>
                  {billingPeriod === BILLING_PERIODS.YEARLY && plan.name !== "Starter" && (
                    <div className="text-sm text-blue-500 font-medium">Annual Billing</div>
                  )}
                </div>
                <ul className="space-y-3 md:space-y-4 mb-5 md:mb-6 flex-grow">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start text-sm transition-colors gap-2
                        ${selectedPlan === plan.name 
                          ? 'text-blue-600' 
                          : 'text-gray-600'
                        }`}
                    >
                      <span className="flex-1 text-left">{feature}</span>
                      <svg 
                        className={`w-4 h-4 flex-shrink-0 mt-0.5
                          ${selectedPlan === plan.name 
                            ? 'text-blue-500' 
                            : 'text-blue-400'
                          }`}
                        viewBox="0 0 24 24"
                      >
                        <path 
                          fill="currentColor"
                          d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                        />
                      </svg>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4 flex justify-end">
                  {renderPlanButton(plan)}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        <FAQSection />
      </div>
    </section>
  );
} 