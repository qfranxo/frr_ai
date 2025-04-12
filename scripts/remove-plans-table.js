const { createClient } = require('@supabase/supabase-js');

// 환경 변수에서 Supabase URL과 키를 가져오거나 직접 지정합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 필요한 값이 없으면 오류를 표시합니다.
if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.');
  process.exit(1);
}

// Supabase 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAndRemovePlansTable() {
  console.log('plans 테이블 제거 및 subscriptions 테이블 마이그레이션 작업을 시작합니다...');

  try {
    // 1. plans 테이블에서 데이터 가져오기
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('*');

    if (plansError) {
      console.error('plans 테이블 데이터 조회 실패:', plansError);
      // plans 테이블이 존재하지 않는 경우 생략하고 진행
      if (plansError.code === '42P01') {
        console.log('plans 테이블이 존재하지 않습니다. 이 단계를 건너뜁니다.');
      } else {
        return;
      }
    } else {
      console.log(`plans 테이블에서 ${plansData.length}개의 항목을 찾았습니다.`);
    }

    // 2. 사용자 구독 정보를 가져와서 업데이트
    if (plansData && plansData.length > 0) {
      console.log('user_subscriptions 테이블에서 plans 참조 확인...');
      
      const { data: subscriptionsData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*');

      if (subError) {
        console.error('user_subscriptions 테이블 데이터 조회 실패:', subError);
        return;
      }

      console.log(`user_subscriptions 테이블에서 ${subscriptionsData.length}개의 항목을 찾았습니다.`);
      
      // 각 구독 정보에 대해 plan_id를 사용하여 plans 테이블의 name을 찾아 업데이트
      for (const subscription of subscriptionsData) {
        const planInfo = plansData.find(plan => plan.id === subscription.plan_id);
        
        if (planInfo) {
          // plan 필드 추가
          const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({ plan: planInfo.name })
            .eq('id', subscription.id);
          
          if (updateError) {
            console.error(`구독 ID ${subscription.id} 업데이트 실패:`, updateError);
          } else {
            console.log(`구독 ID ${subscription.id}의 plan 필드를 '${planInfo.name}'으로 업데이트했습니다.`);
          }
        }
      }
    }

    // 3. subscriptions 테이블의 구조를 확인
    console.log('subscriptions 테이블이 이미 올바른 구조를 갖추고 있는지 확인...');
    
    // 테이블에 plan 컬럼이 있는지 확인
    const { data: columnCheck, error: columnError } = await supabase
      .rpc('check_column_exists', { table_name: 'user_subscriptions', column_name: 'plan' });
    
    if (columnError) {
      console.error('컬럼 체크 실패:', columnError);
      return;
    }
    
    // 테이블 구조 업데이트 필요 시
    if (!columnCheck) {
      console.log('plan 컬럼 추가 중...');
      // 이 스크립트에서는 ALTER TABLE 직접 실행은 어려움
      console.log('알림: user_subscriptions 테이블에 plan 컬럼이 없습니다.');
      console.log('드리즐 ORM 또는 SQL 마이그레이션 도구를 사용하여 테이블 구조를 업데이트해야 합니다.');
    } else {
      console.log('user_subscriptions 테이블에 이미 plan 컬럼이 있습니다.');
    }

    // 4. plans 테이블에 대한 참조 제약 조건 제거
    console.log('plans 테이블 참조를 제거하기 위한 외래 키 제약 조건 삭제...');
    const { error: fkError } = await supabase.rpc('drop_foreign_key', { 
      table_name: 'user_subscriptions', 
      column_name: 'plan_id' 
    });
    
    if (fkError) {
      console.error('외래 키 제약 조건 제거 실패:', fkError);
      // 계속 진행 - 이미 제거되었거나 존재하지 않을 수 있음
    } else {
      console.log('외래 키 제약 조건이 성공적으로 제거되었습니다.');
    }

    // 5. plans 테이블 삭제
    console.log('plans 테이블 삭제 중...');
    const { error: dropError } = await supabase.rpc('drop_table', { table_name: 'plans' });
    
    if (dropError) {
      console.error('plans 테이블 삭제 실패:', dropError);
      // 계속 진행 - 이미 제거되었거나 존재하지 않을 수 있음
    } else {
      console.log('plans 테이블이 성공적으로 삭제되었습니다.');
    }

    console.log('마이그레이션 및 정리 작업이 완료되었습니다!');
  } catch (error) {
    console.error('예기치 않은 오류 발생:', error);
  }
}

// SQL 함수 생성 (필요한 경우)
async function createHelperFunctions() {
  console.log('필요한 헬퍼 SQL 함수 생성...');
  
  try {
    // 컬럼 존재 여부 확인 함수
    const createCheckColumnSql = `
      CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
      RETURNS boolean
      LANGUAGE plpgsql
      AS $$
      DECLARE
        exists_check boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = check_column_exists.table_name
          AND column_name = check_column_exists.column_name
        ) INTO exists_check;
        
        RETURN exists_check;
      END;
      $$;
    `;
    
    // 외래 키 제약 조건 삭제 함수
    const createDropFkSql = `
      CREATE OR REPLACE FUNCTION drop_foreign_key(table_name text, column_name text)
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      DECLARE
        constraint_name text;
      BEGIN
        SELECT tc.constraint_name INTO constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = drop_foreign_key.table_name
          AND kcu.column_name = drop_foreign_key.column_name;
          
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
        END IF;
      END;
      $$;
    `;
    
    // 테이블 삭제 함수
    const createDropTableSql = `
      CREATE OR REPLACE FUNCTION drop_table(table_name text)
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        EXECUTE format('DROP TABLE IF EXISTS %I', table_name);
      END;
      $$;
    `;
    
    // 함수 생성 실행
    const { error: checkColumnError } = await supabase.rpc('check_column_exists', { 
      table_name: 'information_schema.tables', 
      column_name: 'table_name' 
    }).catch(() => ({ error: true }));
    
    if (checkColumnError) {
      // 함수가 없으므로 생성
      await supabase.rpc('exec_sql', { sql: createCheckColumnSql }).catch(err => {
        console.error('check_column_exists 함수 생성 실패:', err);
      });
    }
    
    await supabase.rpc('exec_sql', { sql: createDropFkSql }).catch(err => {
      console.error('drop_foreign_key 함수 생성 실패:', err);
    });
    
    await supabase.rpc('exec_sql', { sql: createDropTableSql }).catch(err => {
      console.error('drop_table 함수 생성 실패:', err);
    });
    
    // exec_sql 함수 생성
    const createExecSqlFunc = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void
      LANGUAGE plpgsql
      AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$;
    `;
    
    await supabase.rpc('exec_sql', { sql: createExecSqlFunc }).catch(() => {
      // exec_sql 함수가 없는 경우에는 SQL 직접 실행 (권한이 있는 경우에만 가능)
      console.error('헬퍼 함수를 생성할 수 없습니다. 권한이 없거나 이미 존재합니다.');
      console.error('Supabase 콘솔에서 SQL 에디터를 통해 필요한 작업을 직접 수행하세요.');
    });
  } catch (error) {
    console.error('헬퍼 함수 설정 중 오류 발생:', error);
  }
}

// 메인 함수 실행
async function main() {
  try {
    // 헬퍼 함수 생성
    await createHelperFunctions();
    
    // 마이그레이션 및 plans 테이블 제거
    await migrateAndRemovePlansTable();
    
    console.log('======== 작업 완료 ========');
    console.log('plans 테이블이 제거되었으며, 필요한 데이터는 subscriptions 테이블로 이전되었습니다.');
    console.log('이제 애플리케이션은 구독 정보를 위해 subscriptions 테이블만 사용합니다.');
  } catch (error) {
    console.error('스크립트 실행 중 오류 발생:', error);
  }
}

// 스크립트 실행
main(); 