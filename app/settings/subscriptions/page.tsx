'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  billing_cycle: string;
  auto_renew: boolean;
  next_renewal_date: string;
  cancelled: boolean;
  created_at: string;
  usage_count: number;
  last_reset_at: string;
  is_active: boolean;
  refunded: boolean;
  
  // 추가 정보
  maxGenerations?: number;
  remaining?: number;
  tier?: string;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, isSignedIn } = useAuth();
  
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!isLoaded || !isSignedIn) return;
      
      try {
        const response = await fetch('/api/subscription');
        if (!response.ok) {
          throw new Error('구독 정보를 가져오는데 실패했습니다');
        }
        
        const data = await response.json();
        setSubscription(data.subscription);
      } catch (err) {
        setError(err instanceof Error ? err.message : '구독 정보를 가져오는데 오류가 발생했습니다');
        console.error('구독 정보 로딩 오류:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionData();
  }, [isLoaded, isSignedIn]);
  
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">구독 정보</h1>
          <p className="text-center text-gray-600">구독 정보를 확인하려면 로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">오류 발생</h1>
          <p className="text-center text-red-500">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-lg p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">구독 정보</h1>
          <p className="text-center text-gray-600">구독 정보가 없습니다.</p>
        </div>
      </div>
    );
  }
  
  // 날짜 형식 변환 함수
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <h1 className="text-3xl font-bold text-white">구독 정보</h1>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 구독 정보 */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">기본 정보</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">구독 플랜</p>
                  <p className="text-lg font-medium">
                    {subscription.plan === 'premium' ? '프리미엄' : 
                     subscription.plan === 'starter' ? '스타터' : 
                     subscription.plan}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">생성 가능 횟수</p>
                  <p className="text-lg font-medium">
                    {subscription.remaining} / {subscription.maxGenerations}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">현재 사용량</p>
                  <p className="text-lg font-medium">{subscription.usage_count} 회</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">구독 상태</p>
                  <p className={`text-lg font-medium ${subscription.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {subscription.is_active ? '활성' : '비활성'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 결제 및 갱신 정보 */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">결제 및 갱신 정보</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">결제 주기</p>
                  <p className="text-lg font-medium">
                    {subscription.billing_cycle === 'monthly' ? '월간' : 
                     subscription.billing_cycle === 'yearly' ? '연간' : 
                     subscription.billing_cycle}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">자동 갱신</p>
                  <p className="text-lg font-medium">
                    {subscription.auto_renew ? '활성화' : '비활성화'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">다음 갱신일</p>
                  <p className="text-lg font-medium">
                    {formatDate(subscription.next_renewal_date)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">마지막 리셋일</p>
                  <p className="text-lg font-medium">
                    {formatDate(subscription.last_reset_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 추가 정보 */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">추가 정보</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">구독 ID</p>
                <p className="text-lg font-medium">{subscription.id}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">생성일</p>
                <p className="text-lg font-medium">{formatDate(subscription.created_at)}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">취소 여부</p>
                <p className="text-lg font-medium">{subscription.cancelled ? '취소됨' : '취소되지 않음'}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">환불 여부</p>
                <p className="text-lg font-medium">{subscription.refunded ? '환불됨' : '환불되지 않음'}</p>
              </div>
            </div>
          </div>
          
          {/* 개발 정보 (개발자만 볼 수 있게) */}
          <div className="mt-8 border border-gray-200 p-6 rounded-lg">
            <details>
              <summary className="text-sm text-gray-500 cursor-pointer">개발자 정보 (JSON)</summary>
              <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto text-xs">
                {JSON.stringify(subscription, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
} 