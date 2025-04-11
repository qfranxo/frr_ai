// We'll use a simple mock for Clerk functionality since we're having import issues
// In production, this would be replaced with actual Clerk client implementation
import { supabase } from '@/lib/supabase';

// User subscription type
export interface SubscriptionInfo {
  tier: 'free' | 'starter' | 'premium';
  maxGenerations: number; // Maximum number of generations per month
  renewalDate: Date; // Renewal date
}

// Usage tracking type
export interface UsageInfo {
  userId: string;
  generationsThisMonth: number;
  lastGenerationDate: Date;
  monthStartDate: Date; // Usage calculation start date
}

// In-memory database (should be replaced with real DB in production)
const usersSubscriptions = new Map<string, SubscriptionInfo>();
const usersUsage = new Map<string, UsageInfo>();
const userMetadata = new Map<string, any>(); // Mock user metadata storage

// localStorage 키 상수
const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'user_subscriptions',
  USAGE: 'user_usage',
  METADATA: 'user_metadata'
};

// 브라우저 환경인지 확인하는 헬퍼 함수
const isBrowser = () => typeof window !== 'undefined';

// localStorage에서 데이터 로드
const loadFromStorage = () => {
  if (!isBrowser()) return;
  
  try {
    const subscriptions = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
    const usage = localStorage.getItem(STORAGE_KEYS.USAGE);
    const metadata = localStorage.getItem(STORAGE_KEYS.METADATA);

    if (subscriptions) {
      const parsed = JSON.parse(subscriptions);
      Object.entries(parsed).forEach(([key, value]) => {
        usersSubscriptions.set(key, value as SubscriptionInfo);
      });
    }

    if (usage) {
      const parsed = JSON.parse(usage);
      Object.entries(parsed).forEach(([key, value]) => {
        usersUsage.set(key, value as UsageInfo);
      });
    }

    if (metadata) {
      const parsed = JSON.parse(metadata);
      Object.entries(parsed).forEach(([key, value]) => {
        userMetadata.set(key, value);
      });
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
};

// localStorage에 데이터 저장
const saveToStorage = () => {
  if (!isBrowser()) return;
  
  try {
    const subscriptions = Object.fromEntries(usersSubscriptions);
    const usage = Object.fromEntries(usersUsage);
    const metadata = Object.fromEntries(userMetadata);

    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(subscriptions));
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(usage));
    localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// 초기 데이터 로드
if (isBrowser()) {
  loadFromStorage();
}

/**
 * Get user's subscription information
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionInfo> {
  try {
    // 먼저 Supabase에서 구독 정보 조회
    const { data: subscriptionData, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Supabase에 구독 정보가 있는 경우 이를 우선 사용
    if (!error && subscriptionData) {
      const tier = subscriptionData.plan === 'premium' ? 'premium' : 
                  subscriptionData.plan === 'starter' ? 'starter' : 'free';
                  
      const maxGenerations = 
        tier === 'premium' ? 50 : 
        tier === 'starter' ? 2 : 0;
      
      const supabaseSubscription: SubscriptionInfo = {
        tier: tier,
        maxGenerations: maxGenerations,
        renewalDate: new Date(subscriptionData.next_renewal_date || getNextMonthDate())
      };
      
      // 메모리에도 Supabase 정보 캐싱
      usersSubscriptions.set(userId, supabaseSubscription);
      saveToStorage();
      
      return supabaseSubscription;
    }
    
    // Supabase에 정보가 없는 경우에만 메모리 캐시 확인
    if (usersSubscriptions.has(userId)) {
      return usersSubscriptions.get(userId)!;
    }

    // 메모리에도 없는 경우 로컬 메타데이터 확인
    const metadata = userMetadata.get(userId) || {};
    
    if (metadata?.subscriptionTier) {
      const subscriptionInfo: SubscriptionInfo = {
        tier: metadata.subscriptionTier,
        maxGenerations: metadata.subscriptionTier === 'premium' ? 50 : 
                        metadata.subscriptionTier === 'starter' ? 2 : 0,
        renewalDate: new Date(metadata.subscriptionRenewalDate || getNextMonthDate())
      };
      usersSubscriptions.set(userId, subscriptionInfo);
      saveToStorage();
      
      // Supabase에도 신규 구독 정보 생성
      try {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan: subscriptionInfo.tier,
            usage_count: 0,
            billing_cycle: 'monthly',
            next_renewal_date: subscriptionInfo.renewalDate,
            created_at: new Date(),
            last_reset_at: new Date(),
            is_active: true,
            auto_renew: true
          });
        
        if (insertError) {
          console.error('신규 구독 생성 실패:', insertError);
        }
      } catch (dbError) {
        console.error('Supabase 구독 생성 중 오류:', dbError);
      }
      
      return subscriptionInfo;
    }

    // 모든 로그인한 사용자에게 자동으로 스타터 플랜 부여
    console.log(`Assigning starter plan to new user: ${userId}`);
    
    // Create default starter subscription
    const defaultSubscription: SubscriptionInfo = {
      tier: 'starter',
      maxGenerations: 2, // Starter users get 2 generations per month
      renewalDate: new Date(getNextMonthDate())
    };
    
    // Save default subscription to user metadata
    userMetadata.set(userId, {
      ...metadata,
      subscriptionTier: 'starter',
      subscriptionRenewalDate: defaultSubscription.renewalDate.toISOString()
    });
    
    usersSubscriptions.set(userId, defaultSubscription);
    saveToStorage();
    
    // Supabase에도 신규 스타터 구독 정보 생성
    try {
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: 'starter',
          usage_count: 0,
          billing_cycle: 'monthly',
          next_renewal_date: new Date(getNextMonthDate()),
          created_at: new Date(),
          last_reset_at: new Date(),
          is_active: true,
          auto_renew: true
        });
      
      if (insertError) {
        console.error('신규 스타터 구독 생성 실패:', insertError);
      }
    } catch (dbError) {
      console.error('Supabase 스타터 구독 생성 중 오류:', dbError);
    }
    
    return defaultSubscription;
  } catch (error) {
    console.error('Error fetching subscription info:', error);
    // Return default starter info on error
    return {
      tier: 'starter',
      maxGenerations: 2,
      renewalDate: new Date(getNextMonthDate())
    };
  }
}

/**
 * Get user's usage information
 */
export async function getUserUsage(userId: string): Promise<UsageInfo> {
  // Check if already cached
  if (usersUsage.has(userId)) {
    const usage = usersUsage.get(userId)!;
    
    // Check if data is for current month
    const today = new Date();
    if (today.getMonth() !== usage.monthStartDate.getMonth() || 
        today.getFullYear() !== usage.monthStartDate.getFullYear()) {
      // Reset usage for new month
      const newUsage: UsageInfo = {
        userId,
        generationsThisMonth: 0,
        lastGenerationDate: today,
        monthStartDate: today
      };
      usersUsage.set(userId, newUsage);
      return newUsage;
    }
    
    return usage;
  }

  // Create default usage info
  const defaultUsage: UsageInfo = {
    userId,
    generationsThisMonth: 0,
    lastGenerationDate: new Date(),
    monthStartDate: new Date()
  };
  usersUsage.set(userId, defaultUsage);
  return defaultUsage;
}

/**
 * Increment user's generation count
 */
export async function incrementUserGenerations(userId: string): Promise<UsageInfo> {
  // 기존 메모리 기반 사용량 업데이트 유지 (하위 호환성)
  const usage = await getUserUsage(userId);
  const updatedUsage: UsageInfo = {
    ...usage,
    generationsThisMonth: usage.generationsThisMonth + 1,
    lastGenerationDate: new Date(),
  };
  usersUsage.set(userId, updatedUsage);
  
  // Supabase subscriptions 테이블 업데이트 추가
  try {
    // 먼저 사용자의 구독 정보 조회
    const { data: subscriptionData, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {  // PGRST116: 결과가 없을 때의 에러 코드
      console.error('구독 정보 조회 실패:', fetchError);
      // 실패해도 계속 진행 (메모리 기반 정보 반환)
    } else if (subscriptionData) {
      // 구독 정보가 있으면 usage_count 증가
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          usage_count: (subscriptionData.usage_count || 0) + 1,
          // last_reset_at은 변경하지 않음 (리셋 로직과 분리)
        })
        .eq('id', subscriptionData.id);
      
      if (updateError) {
        console.error('구독 사용량 업데이트 실패:', updateError);
      } else {
        console.log(`사용자 ${userId}의 구독 사용량이 ${(subscriptionData.usage_count || 0) + 1}로 업데이트됨`);
      }
    } else {
      // 구독 정보가 없으면 신규 생성 (새 사용자)
      const subscription = await getUserSubscription(userId);
      const tierValue = subscription?.tier || 'starter';
      
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: tierValue,
          usage_count: 1,
          billing_cycle: 'monthly',
          next_renewal_date: new Date(getNextMonthDate()),
          created_at: new Date(),
          last_reset_at: new Date(),
          is_active: true,
          auto_renew: true
        });
      
      if (insertError) {
        console.error('신규 구독 생성 실패:', insertError);
      } else {
        console.log(`사용자 ${userId}의 신규 구독 생성 완료 (사용량: 1)`);
      }
    }
  } catch (dbError) {
    console.error('Supabase 구독 업데이트 중 오류:', dbError);
    // DB 업데이트 실패해도 메모리 기반 정보는 반환
  }
  
  return updatedUsage;
}

/**
 * Check if user can generate more images
 * @returns Whether user can generate and remaining generations
 */
export async function canUserGenerate(userId: string): Promise<{canGenerate: boolean, remaining: number}> {
  // 메모리 기반 구독 & 사용량 정보 가져오기 (기존 로직)
  const subscription = await getUserSubscription(userId);
  const usage = await getUserUsage(userId);
  
  // Supabase에서 최신 사용량 확인
  try {
    const { data: subscriptionData, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!error && subscriptionData) {
      // Supabase 데이터가 있으면 이를 기준으로 사용 가능 여부 결정
      const supabaseUsageCount = subscriptionData.usage_count || 0;
      const tier = subscriptionData.plan || 'starter';
      
      // 각 티어별 최대 생성 가능 횟수
      const maxGenerations = 
        tier === 'premium' ? 50 : 
        tier === 'starter' ? 2 : 0;
      
      // 남은 생성 횟수 계산
      const remaining = Math.max(0, maxGenerations - supabaseUsageCount);
      
      return {
        canGenerate: remaining > 0,
        remaining
      };
    }
  } catch (dbError) {
    console.error('Supabase 구독 정보 조회 중 오류:', dbError);
    // DB 조회 실패시 메모리 기반 정보 사용
  }
  
  // Supabase 조회 실패 시 기존 메모리 기반 로직 사용 (폴백)
  const remaining = subscription.maxGenerations - usage.generationsThisMonth;
  return {
    canGenerate: remaining > 0,
    remaining
  };
}

/**
 * Calculate next month's date
 */
function getNextMonthDate(): string {
  const today = new Date();
  // Set date to same day next month
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth.toISOString();
}

/**
 * Upgrade subscription plan (to premium)
 */
export async function upgradeSubscription(userId: string): Promise<SubscriptionInfo> {
  try {
    if (!userId) {
      throw new Error("User ID is required for subscription upgrade");
    }
    
    console.log(`Upgrading subscription for user: ${userId}`);
    
    // In a real application, this would include a payment gateway integration
    // For demo purposes, we directly upgrade the subscription
    
    const renewalDate = getNextMonthDate();
    const subscriptionInfo: SubscriptionInfo = {
      tier: 'premium',
      maxGenerations: 50, // Premium users get 50 generations per month
      renewalDate: new Date(renewalDate)
    };
    
    // Update user metadata (in our mock storage)
    const metadata = userMetadata.get(userId) || {};
    userMetadata.set(userId, {
      ...metadata,
      subscriptionTier: 'premium',
      subscriptionRenewalDate: renewalDate
    });
    
    // Cache the updated subscription
    usersSubscriptions.set(userId, subscriptionInfo);
    saveToStorage(); // 변경사항 저장
    
    console.log(`Successfully upgraded subscription for user ${userId} to premium`);
    return subscriptionInfo;
  } catch (error) {
    console.error(`Error upgrading subscription for user ${userId}:`, error);
    throw new Error(`Failed to upgrade subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// lib/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/migrations/schema'

// PostgreSQL 클라이언트 타입
type PostgresClient = ReturnType<typeof postgres>;

// DB 연결 여부를 확인하는 플래그
let isDbConnected = false;

// DATABASE_URL이 환경변수에 설정되어 있는지 확인
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables. Using mock database.');
}

// 클라이언트 선언 및 타입 지정
let client: PostgresClient | undefined;

// 데이터베이스 URL 정상화 함수
function normalizeDbUrl(url: string): string {
  try {
    // URL이 이미 정상적인 형식인지 확인
    if (url.startsWith('postgresql://')) {
      return url;
    }
    
    // postgres:// 시작하면 postgresql://로 변경
    if (url.startsWith('postgres://')) {
      return url.replace('postgres://', 'postgresql://');
    }
    
    return url;
  } catch (e) {
    console.error('Failed to normalize database URL:', e);
    return url;
  }
}

try {
  // DATABASE_URL이 있는 경우에만 실제 DB 연결 시도
  if (process.env.DATABASE_URL) {
    const dbUrl = normalizeDbUrl(process.env.DATABASE_URL);
    console.log('Connecting to database...');
    
    client = postgres(dbUrl, {
      max: 5, // 더 적은 최대 연결 수 (리소스 과다 사용 방지)
      idle_timeout: 30, // 유휴 연결 타임아웃 증가
      connect_timeout: 15, // 연결 타임아웃 증가
      prepare: false, // 단순 쿼리는 prepare 비활성화
      ssl: { rejectUnauthorized: false }, // SSL 인증서 검증 비활성화 (개발 환경용)
      max_lifetime: 60 * 10, // 연결 수명 10분으로 증가
    });
    
    // 연결 테스트 지연 실행 (서버 시작 시 즉시 실행되지 않도록)
    setTimeout(async () => {
      try {
        if (client) {
          await client`SELECT 1`;
          console.log('Database connection successful');
          isDbConnected = true;
        }
      } catch (error) {
        console.error('Database connection failed. Details:', error);
        
        // 대체 연결 정보로 시도
        try {
          const directConnUrl = process.env.DIRECT_DATABASE_URL || 
                              'postgresql://postgres.nipdzyfwjqpgojcccoqgm:vxePeqNCLMKBDe6P@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';
          
          console.log('Trying alternative connection...');
          client = postgres(directConnUrl, {
            max: 3,
            idle_timeout: 20,
            connect_timeout: 10,
            ssl: { rejectUnauthorized: false },
          });
          
          await client`SELECT 1`;
          console.log('Alternative database connection successful');
          isDbConnected = true;
        } catch (altError) {
          console.error('Alternative connection also failed:', altError);
          isDbConnected = false;
        }
      }
    }, 3000); // 3초 후 연결 테스트 실행
  }
} catch (error) {
  console.error('Failed to initialize database client:', error);
  // 연결 실패 시 클라이언트가 undefined 상태로 남을 수 있음
}

// 클라이언트가 없거나 연결 실패 시 사용할 Noop 클라이언트
// 이것은 drizzle에 전달되는 클라이언트의 인터페이스를 충족시키기 위한 것
const noopClient = new Proxy({}, {
  get(target, prop) {
    if (prop === 'then') return undefined; // Promise와 호환되지 않도록
    return (...args: any) => {
      console.warn(`Database operation attempted but database is not connected: ${String(prop)}`);
      return Promise.reject(new Error('Database is not connected'));
    };
  }
});

// 실제 클라이언트 또는 Noop 클라이언트를 사용
export const db = drizzle(client || noopClient as any, { schema });

// 연결 테스트 함수 - 내부용으로 변경 (외부 노출 제한)
async function testConnection() {
  try {
    if (!client) {
      console.log('No client available. Creating a new one for test...');
      
      if (process.env.DATABASE_URL) {
        const testClient = postgres(normalizeDbUrl(process.env.DATABASE_URL), {
          max: 1,
          idle_timeout: 10,
          connect_timeout: 10,
          ssl: { rejectUnauthorized: false },
        });
        
        await testClient`SELECT 1`;
        await testClient.end();
        console.log('Test connection successful');
        return true;
      }
      return false;
    }
    
    await client`SELECT 1`;
    console.log('Database connection successful');
    isDbConnected = true;
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    isDbConnected = false;
    return false;
  }
}

// DB 연결 상태 확인 함수
export function isDatabaseConnected() {
  return isDbConnected;
}

// 사용자별 이미지 접근 및 관리 함수 추가

/**
 * 사용자별 공유된 이미지 목록을 가져옵니다.
 * 
 * @param userId 사용자 ID
 * @returns 사용자가 생성한 공유 이미지 목록
 */
export async function getUserSharedImages(userId: string) {
  try {
    const { data, error } = await supabase
      .from('shared_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('사용자 공유 이미지 조회 오류:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('사용자 공유 이미지 조회 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 사용자가 공유한 이미지를 공유 취소합니다.
 * 
 * @param userId 사용자 ID
 * @param imageId 이미지 ID
 * @returns 성공 여부
 */
export async function unshareUserImage(userId: string, imageId: string) {
  try {
    // 1. 이미지가 사용자의 것인지 확인
    const { data: imageCheck, error: checkError } = await supabase
      .from('shared_images')
      .select('id, user_id, storage_path')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !imageCheck) {
      console.error('이미지 접근 권한 없음:', checkError || '사용자의 이미지가 아닙니다.');
      return { success: false, error: '이미지 접근 권한이 없습니다.' };
    }
    
    // 2. 이미지 공유 상태 업데이트
    const { error: updateError } = await supabase
      .from('shared_images')
      .update({ shared: false })
      .eq('id', imageId)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('이미지 공유 취소 오류:', updateError);
      return { success: false, error: updateError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('이미지 공유 취소 중 오류 발생:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 사용자의 이미지를 삭제합니다.
 * 
 * @param userId 사용자 ID
 * @param imageId 이미지 ID
 * @returns 성공 여부
 */
export async function deleteUserImage(userId: string, imageId: string) {
  try {
    // 1. 이미지가 사용자의 것인지 확인
    const { data: imageCheck, error: checkError } = await supabase
      .from('shared_images')
      .select('id, user_id, storage_path')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !imageCheck) {
      console.error('이미지 접근 권한 없음:', checkError || '사용자의 이미지가 아닙니다.');
      return { success: false, error: '이미지 접근 권한이 없습니다.' };
    }
    
    // 2. Storage에서 이미지 삭제 (storage_path가 있는 경우)
    if (imageCheck.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('image')
        .remove([imageCheck.storage_path]);
      
      if (storageError) {
        console.warn('스토리지 이미지 삭제 실패:', storageError);
        // 스토리지 삭제 실패해도 DB에서는 삭제 진행
      }
    }
    
    // 3. DB에서 이미지 레코드 삭제
    const { error: deleteError } = await supabase
      .from('shared_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('이미지 삭제 오류:', deleteError);
      return { success: false, error: deleteError.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}
