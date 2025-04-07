import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
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

export async function POST(req: NextRequest) {
  // Clerk webhook 시크릿 키
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // 헤더 검증 - 헤더를 직접 요청 객체에서 가져옴
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { success: false, error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // 요청 본문 파싱
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Webhook 서명 검증
  let event: WebhookEvent;
  try {
    const webhook = new Webhook(WEBHOOK_SECRET);
    event = webhook.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook 검증 오류:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // 이벤트 유형에 따른 처리
  const eventType = event.type;
  console.log(`Webhook 이벤트 수신: ${eventType}`);

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, username, first_name, last_name, image_url } = event.data;
      
      // 사용자 이메일 가져오기
      const emailObject = email_addresses?.[0];
      const email = emailObject ? emailObject.email_address : null;

      // Supabase users 테이블에 사용자 정보 동기화
      const { error } = await supabaseAdmin.from('users').upsert({
        id: id, // Clerk ID를 Supabase 사용자 ID로 사용
        email: email,
        username: username || email?.split('@')[0] || id.substring(0, 8),
        full_name: first_name && last_name ? `${first_name} ${last_name}` : null,
        avatar_url: image_url,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

      if (error) {
        console.error('Supabase 사용자 추가 오류:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      console.log(`사용자 ${id} Supabase와 동기화 완료`);
    }
    
    if (eventType === 'user.deleted') {
      const { id } = event.data;

      // 선택적: Supabase에서 사용자 데이터 삭제 또는 비활성화
      // 사용자 삭제보다는 비활성화를 고려 (데이터 참조 무결성 유지를 위해)
      const { error } = await supabaseAdmin.from('users').update({
        active: false,
        updated_at: new Date().toISOString()
      }).eq('id', id);

      if (error) {
        console.error('Supabase 사용자 비활성화 오류:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      console.log(`사용자 ${id} Supabase에서 비활성화 완료`);
    }

    return NextResponse.json(
      { success: true, message: 'Webhook 처리 성공' },
      { status: 200 }
    );
  } catch (err) {
    console.error('Webhook 처리 오류:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
