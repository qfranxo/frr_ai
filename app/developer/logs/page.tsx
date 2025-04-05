import { LogExample } from '@/components/LogExample';

export default function DeveloperLogsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">개발자 로그 도구</h1>
      <p className="text-muted-foreground mb-6">
        이 페이지는 개발 중 로그 시스템을 테스트하고 시연하기 위한 페이지입니다.
        프로덕션 환경에서는 관리자만 접근할 수 있습니다.
      </p>
      
      <div className="grid grid-cols-1 gap-6">
        <LogExample />
      </div>
    </div>
  );
} 