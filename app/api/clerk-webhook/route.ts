import { Webhook } from 'svix';
import { NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  // 웹훅 검증
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('웹훅 헤더 누락');
    return NextResponse.json({ error: '웹훅 헤더 누락' }, { status: 400 });
  }

  // 요청 본문 가져오기
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  // 웹훅 이벤트 처리
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET이 설정되지 않음');
    return NextResponse.json({ error: '웹훅 시크릿 누락' }, { status: 400 });
  }

  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;
  
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('웹훅 검증 오류:', err);
    return NextResponse.json({ error: '웹훅 검증 실패' }, { status: 400 });
  }

  console.log('Clerk 웹훅 이벤트 수신:', evt.type);

  // 사용자 생성/업데이트 이벤트 처리
  const eventType = evt.type;
  
  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || username || 'Unknown';
    
    console.log('사용자 정보 동기화:', { id, email, name });
    
    try {
      // Supabase에 관리자 권한 설정 (RLS 우회)
      await supabase.rpc('set_admin_role', { is_admin: true });
      
      // Supabase users 테이블에 사용자 정보 추가/업데이트
      const { error } = await supabase
        .from('users')
        .upsert({
          id: id,
          email: email,
          name: name,
          profile_image: image_url,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Supabase 사용자 데이터 동기화 오류:', error);
      } else {
        console.log('사용자 데이터가 성공적으로 동기화됨:', id);
      }
      
      // 신규 사용자인 경우 (user.created 이벤트)
      if (eventType === 'user.created') {
        // 기존 구독 정보 확인
        const { data: existingSubscription } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', id)
          .single();
          
        // 구독 정보가 없는 경우에만 생성
        if (!existingSubscription) {
          // 다음 달 날짜 계산
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          // 기본 구독 정보 생성
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: id,
              plan: 'starter',
              billing_cycle: 'monthly',
              auto_renew: true,
              next_renewal_date: nextMonth.toISOString(),
              cancelled: false,
              created_at: new Date().toISOString(),
              usage_count: 0,
              last_reset_at: new Date().toISOString(),
              is_active: true,
              refunded: false
            });
            
          if (subscriptionError) {
            console.error('Supabase 구독 데이터 생성 오류:', subscriptionError);
          } else {
            console.log('사용자 기본 구독이 성공적으로 생성됨:', id);
          }
        }
      }
    } catch (error) {
      console.error('사용자 데이터 동기화 중 예외 발생:', error);
    } finally {
      // 관리자 권한 비활성화
      try {
        await supabase.rpc('set_admin_role', { is_admin: false });
      } catch (error) {
        console.error('관리자 권한 비활성화 오류:', error);
      }
    }
  }

  return NextResponse.json({ success: true });
} 