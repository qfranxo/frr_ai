import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin 클라이언트 초기화
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Clerk Webhook API
export async function POST(req: Request) {
  // 1. 보안 검증
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new Response('Webhook 시크릿이 설정되지 않음', { status: 500 });
  }

  // 2. 헤더 검증 - Request 객체에서 직접 헤더 가져오기
  const svix_id = req.headers.get('svix-id') || '';
  const svix_timestamp = req.headers.get('svix-timestamp') || '';
  const svix_signature = req.headers.get('svix-signature') || '';

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('svix 헤더 누락', { status: 400 });
  }

  // 3. 요청 본문 검증
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  // 4. 서명 검증
  let event: WebhookEvent;
  try {
    const webhook = new Webhook(WEBHOOK_SECRET);
    event = webhook.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    }) as WebhookEvent;
  } catch (err) {
    console.error('서명 검증 오류:', err);
    return new Response('유효하지 않은 서명', { status: 400 });
  }

  // 5. 이벤트 처리
  const eventType = event.type;
  console.log(`웹훅 이벤트 수신: ${eventType}`);
  
  // 6. 이벤트에 따른 작업 수행
  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
        
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
        
      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
        
      // 기타 이벤트 처리
      default:
        console.log(`처리되지 않은 이벤트 타입: ${eventType}`);
    }
    
    // 무거운 작업은 비동기로 처리하고 즉시 응답
    processUserAsync(event.data).catch(console.error);
    
    // 7. 성공 응답 반환 (중요: 항상 200 응답)
    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    // 8. 오류 로깅 (에러가 발생해도 200 반환)
    console.error('웹훅 처리 중 오류:', error);
    console.error('웹훅 오류:', {
      event: eventType,
      error: error instanceof Error ? error.message : String(error),
      userId: event.data.id,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({ 
      success: true,  // Clerk에 성공으로 알려 재시도를 방지
      error: '처리됨 (오류 기록됨)'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 무거운 작업은 비동기로 처리하고 즉시 응답
async function processUserAsync(userData: any) {
  try {
    // 시간이 오래 걸리는 작업 수행
  } catch (error) {
    console.error('비동기 처리 오류:', error);
  }
}

// 사용자 생성 처리 - Supabase users 테이블에 직접 저장
async function handleUserCreated(userData: any) {
  try {
    // Clerk 사용자 데이터 추출
    const { id, email_addresses, username, first_name, last_name, image_url } = userData;
    
    // 필요한 데이터 추출
    const email = email_addresses?.[0]?.email_address || '';
    const name = first_name ? (last_name ? `${first_name} ${last_name}` : first_name) : (username || email.split('@')[0]);
    
    console.log('새 사용자 생성:', { id, email, name });
    
    // Supabase users 테이블에 직접 사용자 삽입 - 정확한 필드명 사용
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert([
        {
          id: id,
          email: email,
          name: name,
          profile_image: image_url,
          created_at: new Date().toISOString()
        }
      ], { onConflict: 'id' })
      .select();
    
    if (error) {
      console.error('Supabase users 테이블 삽입 오류:', error);
      throw error;
    }
    
    console.log('Supabase users 테이블에 사용자 저장 성공:', data?.[0]?.id);
  } catch (error) {
    console.error('handleUserCreated 오류:', error);
    throw error;
  }
}

// 사용자 업데이트 처리
async function handleUserUpdated(userData: any) {
  try {
    // Clerk 사용자 데이터 추출
    const { id, email_addresses, username, first_name, last_name, image_url } = userData;
    
    // 필요한 데이터 추출
    const email = email_addresses?.[0]?.email_address || '';
    const name = first_name ? (last_name ? `${first_name} ${last_name}` : first_name) : (username || email.split('@')[0]);
    
    console.log('사용자 업데이트:', { id, email, name });
    
    // Supabase users 테이블에 직접 사용자 업데이트
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        email: email,
        name: name,
        profile_image: image_url
      })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Supabase users 테이블 업데이트 오류:', error);
      throw error;
    }
    
    console.log('Supabase users 테이블에 사용자 업데이트 성공:', data?.[0]?.id);
  } catch (error) {
    console.error('handleUserUpdated 오류:', error);
    throw error;
  }
}

// 사용자 삭제 처리
async function handleUserDeleted(userData: any) {
  try {
    const { id } = userData;
    
    console.log('사용자 삭제:', id);
    
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        active: false
      })
      .eq('id', id);
    
    if (error) {
      console.error('Supabase users 테이블 사용자 삭제 오류:', error);
      throw error;
    }
    
    console.log('Supabase users 테이블에서 사용자 삭제 성공:', id);
  } catch (error) {
    console.error('handleUserDeleted 오류:', error);
    throw error;
  }
} 