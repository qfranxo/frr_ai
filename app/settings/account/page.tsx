"use client";

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CreditCard, User, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import LoadingScreen from '@/components/shared/LoadingScreen';

interface SubscriptionInfo {
  tier: 'free' | 'premium' | 'starter';
  maxGenerations: number;
  remaining: number;
  renewalDate: Date;
  startDate?: Date;
  nextBillingDate?: Date;
  autoRenew?: boolean;
}

// 구독 정보 캐싱을 위한 상수 추가
const SUBSCRIPTION_CACHE_KEY = 'cached_subscription_data';
const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 1시간 캐시 유지

// 기본 스타터 플랜 상수 정의
const DEFAULT_STARTER_PLAN: SubscriptionInfo = {
  tier: 'starter',
  maxGenerations: 3,
  remaining: 3,
  renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  startDate: new Date(),
  nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  autoRenew: true
};

export default function AccountSettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openUserProfile } = useClerk();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialRender, setHasInitialRender] = useState(false);

  // 페이지 마운트 시 기본 스타터 플랜 설정
  useEffect(() => {
    if (isSignedIn && !subscription) {
      // 데이터 로드 중에 기본 스타터 플랜 표시
      setSubscription(DEFAULT_STARTER_PLAN);
    }
  }, [isSignedIn, subscription]);

  // 첫 페이지 로드 시 스켈레톤 UI 렌더링을 위한 초기 설정
  useEffect(() => {
    // 페이지가 이미 한 번 렌더링되었음을 표시
    if (!hasInitialRender) {
      setHasInitialRender(true);
    }
  }, [hasInitialRender]);

  // 구독 정보 가져오기 - 캐싱 적용
  useEffect(() => {
    // 이미 로그인 상태이고 데이터 로딩 중인 경우에만 실행
    if (isSignedIn && isLoading) {
      fetchSubscriptionInfo();
    } else if (isLoaded && !isSignedIn) {
      // 로그인되지 않은 사용자는 홈으로 리다이렉트 (임시 비활성화)
      // window.location.href = '/';
    }
  }, [isSignedIn, isLoaded, isLoading]);

  // 구독 정보 조회 함수 - 캐싱 기능 추가, 오류 시 기본 스타터 플랜 사용
  const fetchSubscriptionInfo = async () => {
    setIsLoading(true);
    try {
      // 로컬 캐시에서 구독 정보 확인
      const cachedData = checkCachedSubscription();
      
      if (cachedData) {
        // 캐시된 데이터가 있으면 사용
        setSubscription(cachedData);
        setIsLoading(false);
        
        // 백그라운드에서 최신 데이터 조회 (오래된 캐시 업데이트)
        refreshSubscriptionInBackground();
        return;
      }
      
      // 캐시가 없으면 서버에서 데이터 가져오기
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        const subscriptionData = {
          ...data.subscription,
          renewalDate: new Date(data.subscription.renewalDate),
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          nextBillingDate: new Date(data.subscription.renewalDate),
          autoRenew: true
        };
        
        // 상태 업데이트
        setSubscription(subscriptionData);
        
        // 로컬 스토리지에 캐싱
        cacheSubscriptionData(subscriptionData);
      } else {
        // API 오류 시 기본 스타터 플랜 사용
        console.warn("Failed to load subscription data, using default starter plan");
        setSubscription(DEFAULT_STARTER_PLAN);
        toast.error("Failed to load subscription data, showing default plan");
      }
    } catch (error) {
      console.error("구독 정보 조회 오류:", error);
      // 오류 발생 시 기본 스타터 플랜 사용
      setSubscription(DEFAULT_STARTER_PLAN);
      toast.error("Error loading account data, showing default plan");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 로컬 캐시에서 구독 정보 확인
  const checkCachedSubscription = (): SubscriptionInfo | null => {
    try {
      const cachedDataStr = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (!cachedDataStr) return null;
      
      const { data, timestamp } = JSON.parse(cachedDataStr);
      
      // 캐시 유효 시간 확인
      if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
        // 캐시가 만료되었으면 삭제
        localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
        return null;
      }
      
      // 날짜 객체로 변환
      return {
        ...data,
        renewalDate: new Date(data.renewalDate),
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        nextBillingDate: data.nextBillingDate ? new Date(data.nextBillingDate) : undefined
      };
    } catch (error) {
      // 캐시 파싱 에러 시 캐시 삭제
      localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
      return null;
    }
  };
  
  // 구독 정보 캐싱 함수
  const cacheSubscriptionData = (data: SubscriptionInfo) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      // 캐시 저장 실패 시 조용히 무시
      console.error('Failed to cache subscription data:', error);
    }
  };
  
  // 백그라운드에서 구독 정보 갱신 (캐시 업데이트)
  const refreshSubscriptionInBackground = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        const subscriptionData = {
          ...data.subscription,
          renewalDate: new Date(data.subscription.renewalDate),
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          nextBillingDate: new Date(data.subscription.renewalDate),
          autoRenew: true
        };
        
        // 상태 업데이트
        setSubscription(subscriptionData);
        
        // 캐시 업데이트
        cacheSubscriptionData(subscriptionData);
      }
    } catch (error) {
      // 백그라운드 갱신 실패 시 조용히 무시
    }
  };

  // 프리미엄 구독 업그레이드
  const handleUpgradeSubscription = async () => {
    // 로딩 상태 토스트 ID 저장
    const loadingToast = toast.loading("Upgrading subscription...");
    
    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscription({
          ...data.subscription,
          renewalDate: new Date(data.subscription.renewalDate)
        });
        // 성공 토스트로 업데이트
        toast.success("Successfully upgraded to Premium!", {
          id: loadingToast
        });
      } else {
        const errorData = await response.json();
        // 에러 토스트로 업데이트
        toast.error(errorData.error || "Failed to upgrade. Please try again.", {
          id: loadingToast
        });
      }
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      // 에러 토스트로 업데이트
      toast.error("An error occurred while processing your upgrade", {
        id: loadingToast
      });
    }
  };

  // Account deletion function - simplified to open Clerk security settings
  const handleDeleteAccount = () => {
    // Open Clerk user profile modal
    openUserProfile();
  };

  // 날짜 포맷 함수
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 계정 관리 함수
  const handleManageAccount = () => {
    // Clerk 사용자 프로필 모달 열기
    openUserProfile();
  };

  // 중간 컴포넌트 - 로딩 최적화를 위해 스켈레톤 UI 추가
  if (isLoaded && isSignedIn && !subscription && hasInitialRender) {
    // 로딩 중이지만 첫 렌더링 이후라면 스켈레톤 UI 표시
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* 헤더 및 내비게이션 */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center">
              <Link href="/" className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-500 border border-blue-200/30 shadow-sm hover:shadow-md hover:text-purple-500 hover:from-blue-50 hover:to-purple-100 transition-all mr-3 sm:mr-5">
                <ArrowLeft size={16} />
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent pt-6 pb-4">
                Account Settings
              </h1>
            </div>
          </div>

          {/* 스켈레톤 UI: 사용자 프로필 섹션 */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-5 sm:mb-6 animate-pulse">
            <div className="flex items-start md:items-center flex-col md:flex-row md:gap-6">
              <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-gray-200 mb-3 sm:mb-4 md:mb-0"></div>
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 w-24 bg-gray-200 rounded-full mt-2"></div>
              </div>
            </div>
          </div>

          {/* 스켈레톤 UI: 구독 정보 섹션 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-5 sm:mb-6 animate-pulse">
            <div className="flex items-center mb-3 sm:mb-6">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
            
            <div className="space-y-2.5 sm:space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 스켈레톤 UI: 계정 관리 섹션 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full md:w-1/3 mb-3"></div>
          </div>
        </div>
      </div>
    );
  }

  // 기존 로딩 화면 (첫 렌더링 시에만 표시)
  if (!isLoaded || (isLoading && !hasInitialRender)) {
    return (
      <LoadingScreen
        message=""
        subMessage=""
        type="spinner"
        size="md"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 및 내비게이션 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center">
            <Link href="/" className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-500 border border-blue-200/30 shadow-sm hover:shadow-md hover:text-purple-500 hover:from-blue-50 hover:to-purple-100 transition-all mr-3 sm:mr-5">
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent pt-6 pb-4">
              Account Settings
            </h1>
          </div>
        </div>

        {/* 사용자 프로필 섹션 */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-5 sm:mb-6">
          <div className="flex items-start md:items-center flex-col md:flex-row md:gap-6">
            <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center overflow-hidden mb-3 sm:mb-4 md:mb-0">
              {user?.imageUrl ? (
                <Image 
                  src={user.imageUrl}
                  alt={user.fullName || "Profile"}
                  width={80}
                  height={80}
                  className="object-cover"
                />
              ) : (
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold">{user?.fullName || "User"}</h2>
              <p className="text-sm text-gray-500">{user?.emailAddresses[0]?.emailAddress}</p>
              <div className="mt-2 flex items-center">
                <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium ${
                  subscription?.tier === 'premium' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {subscription?.tier === 'premium' ? 'Premium' : 
                   subscription?.tier === 'starter' ? 'Starter' : 'Free'} Plan
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 구독 정보 섹션 - Adobe 스타일 업데이트 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-5 sm:mb-6">
          <div className="flex items-center mb-3 sm:mb-6">
            <div className="flex-1">
              <h2 className="text-lg md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent inline-flex items-center">
                <CreditCard className="h-3.5 w-3.5 md:h-6 md:w-6 text-purple-500 mr-1.5 md:mr-3" />
                Subscription Details
              </h2>
            </div>
          </div>
          
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-600">Plan</span>
              <span className={`text-xs sm:text-sm font-medium ${
                subscription?.tier === 'premium' 
                  ? 'text-indigo-600 font-bold' 
                  : ''
              }`}>
                {subscription?.tier === 'premium' ? 'Premium' : 
                 subscription?.tier === 'starter' ? 'Starter' : 'Free'}
              </span>
            </div>
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-600">Image Generations</span>
              <span className="text-xs sm:text-sm font-medium">
                {subscription?.remaining} / {subscription?.maxGenerations} remaining
              </span>
            </div>
            
            {subscription?.tier === 'premium' && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-xs sm:text-sm text-gray-600">Next Billing Date</span>
                <span className="text-xs sm:text-sm font-medium">
                  {subscription?.nextBillingDate ? formatDate(subscription.nextBillingDate) : 'N/A'}
                </span>
              </div>
            )}
            
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-xs sm:text-sm text-gray-600">Renewal Date</span>
              <span className="text-xs sm:text-sm font-medium">
                {subscription?.renewalDate ? formatDate(subscription.renewalDate) : 'N/A'}
              </span>
            </div>
            
            {subscription?.tier === 'premium' && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-xs sm:text-sm text-gray-600">Auto Renewal</span>
                <div className="flex items-center">
                  <span className={`text-xs sm:text-sm font-medium mr-2 ${subscription.autoRenew ? 'text-green-600' : 'text-gray-600'}`}>
                    {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-[10px] sm:text-xs text-purple-600 hover:text-purple-700 rounded-full border border-purple-200 hover:border-purple-300 hover:bg-purple-50 px-2 sm:px-3 py-0.5 h-auto transition-all duration-200 hover:shadow-sm flex items-center"
                    onClick={() => toast.info("Auto renewal settings will be available in a future update.")}
                  >
                    <span className="mr-1">Change</span>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-1">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {subscription?.tier !== 'premium' ? (
            <div className="mt-4 sm:mt-6 flex justify-end">
              <div className="flex flex-col items-end">
                <Button
                  onClick={handleUpgradeSubscription}
                  className="px-4 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 hover:bg-blue-700"
                >
                  Upgrade to Premium
                </Button>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                  Get 100 generations per month with Premium
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 sm:mt-6">
              <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="text-xs text-gray-600 hover:text-red-600 border-gray-200 hover:border-red-200 hover:bg-red-50 py-1 px-3 transition-all duration-300 rounded-lg w-auto self-end"
                    >
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90%] sm:w-[460px] max-w-full">
                    <DialogHeader className="space-y-2">
                      <DialogTitle className="flex items-center text-base sm:text-lg text-gray-900">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0 text-red-500" />
                        <span>Cancel Premium Subscription</span>
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm text-gray-600">
                        Are you sure you want to cancel your premium subscription?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg my-3 border border-gray-100">
                      <p className="text-xs sm:text-sm text-gray-800 font-medium mb-2">
                        Please be aware of the following when canceling your subscription:
                      </p>
                      <ul className="list-disc pl-5 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-700">
                        <li>You will continue to have access to premium features until <span className="font-medium">{formatDate(subscription?.renewalDate as Date)}</span>.</li>
                        <li>Full refunds are available within 14 days of subscription start date through customer support.</li>
                        <li>No refunds are available after 14 days of subscription. (Current start date: <span className="font-medium">{subscription?.startDate ? formatDate(subscription.startDate) : 'N/A'}</span>)</li>
                        <li>Your subscription will not automatically renew on the next billing date: <span className="font-medium">{subscription?.nextBillingDate ? formatDate(subscription.nextBillingDate) : 'N/A'}</span>.</li>
                        <li>After the renewal date, your account will revert to the free tier with a limit of 10 image generations per month.</li>
                      </ul>
                      <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 rounded border border-amber-100">
                        <p className="text-[10px] sm:text-xs text-amber-800 flex items-start">
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2 flex-shrink-0 mt-0.5" />
                          <span>You can cancel your subscription at any time before renewal, but refunds must be processed through our customer support.</span>
                        </p>
                      </div>
                    </div>
                    <DialogFooter className="flex justify-end gap-3 mt-2">
                      <DialogClose asChild>
                        <Button variant="outline" className="text-xs sm:text-sm min-w-[80px]">Keep Subscription</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button 
                          variant="destructive" 
                          onClick={() => {
                            /* 취소 로직 구현 필요 */
                            const cancelToast = toast.loading("Processing your cancellation...");
                            // 여기에 실제 취소 API 호출 로직이 추가될 수 있음
                            
                            // 성공 메시지로 토스트 업데이트
                            toast.success("Your subscription has been canceled. You will continue to have premium access until the end of your billing period.", {
                              id: cancelToast
                            });
                            /* Ideally update subscription state here */
                          }}
                          className="text-xs sm:text-sm min-w-[120px]"
                        >
                          Cancel Subscription
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  className="text-xs text-blue-600 border-blue-200 hover:border-blue-300 hover:bg-blue-50 py-1 px-3 transition-all duration-300 rounded-lg w-auto self-end"
                  onClick={() => toast.info("Payment details management will be available in a future update.")}
                >
                  Manage Payment
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 계정 관리 섹션 - 모바일에서 더 컴팩트하게 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mb-8 sm:mb-12">
          <div className="flex items-center mb-3 sm:mb-6">
            <div className="flex-1">
              <h2 className="text-lg md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent inline-flex items-center">
                <User className="h-3.5 w-3.5 md:h-6 md:w-6 text-blue-500 mr-1.5 md:mr-3" />
                Account Management
              </h2>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-xl">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex-1">
                  <Button 
                    onClick={handleManageAccount}
                    variant="ghost" 
                    className="text-xs sm:text-sm text-gray-700 hover:text-blue-600 hover:translate-x-1 transition-all duration-300 p-0 mb-1 flex items-center group"
                  >
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" />
                    Manage your account
                  </Button>
                  <p className="text-[10px] sm:text-xs text-gray-500 md:pr-4">
                    Update your email, password, and profile information. You can also delete your account from the security tab.
                  </p>
                </div>
                
                <div className="flex justify-end mt-2 sm:mt-3">
                  <Button 
                    onClick={handleManageAccount}
                    className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors duration-200 hover:bg-blue-700"
                  >
                    Open settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 