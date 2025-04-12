/**
 * 보안 로깅 유틸리티
 * 민감한 정보를 제거하고 안전하게 로깅하기 위한 함수들을 제공합니다.
 */

// 민감한 정보 패턴을 정의합니다
const SENSITIVE_PATTERNS = [
  // 사용자 ID 패턴 (Clerk, Auth0, Firebase 등)
  /user_[a-zA-Z0-9]{10,}/g,       // Clerk user ID 패턴
  /auth0\|[a-zA-Z0-9]{10,}/g,     // Auth0 user ID 패턴
  /[a-zA-Z0-9]{28}/g,             // Firebase auth ID와 같은 긴 ID

  // 이메일 주소 패턴
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // 토큰 및 API 키 패턴
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,  // JWT 토큰
  /sk_[a-zA-Z0-9]{10,}/g,                                            // Stripe 시크릿 키
  /pk_[a-zA-Z0-9]{10,}/g,                                            // Stripe 퍼블릭 키

  // UUID 패턴
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
];

// 민감한 필드명 목록
const SENSITIVE_FIELDS = [
  'id', 'userId', 'user_id', 'userName', 'user_name', 'name', 
  'firstName', 'lastName', 'email', 'password', 'token',
  'imageUrl', 'image_url', 'profileImage', 'profile_image',
  'phone', 'phoneNumber', 'phone_number', 'address', 'birth',
  'birthdate', 'ssn', 'social', 'secret', 'key', 'apiKey',
  'api_key', 'accessToken', 'access_token', 'refreshToken',
  'refresh_token', 'authToken', 'auth_token', 'credential'
];

/**
 * 문자열에서 민감한 정보를 마스킹합니다.
 * @param text 마스킹할 텍스트
 * @returns 민감한 정보가 마스킹된 텍스트
 */
export function maskSensitiveText(text: string): string {
  if (!text) return text;
  if (typeof text !== 'string') return String(text);
  
  // 모든 민감한 패턴에 대해 마스킹 적용
  let maskedText = text;
  
  SENSITIVE_PATTERNS.forEach(pattern => {
    maskedText = maskedText.replace(pattern, '***마스킹됨***');
  });
  
  return maskedText;
}

/**
 * 객체에서 민감한 정보를 마스킹합니다.
 * @param obj 마스킹할 객체
 * @returns 민감한 정보가 마스킹된 객체의 복사본
 */
export function maskSensitiveData(obj: any): any {
  // 기본 타입이거나 null인 경우 그대로 반환
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return typeof obj === 'string' ? maskSensitiveText(obj) : obj;
  }
  
  // 배열인 경우 각 항목을 재귀적으로 마스킹
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }
  
  // 객체인 경우 각 필드를 확인하여 마스킹
  const maskedObj = { ...obj };
  
  for (const key in maskedObj) {
    // 민감한 필드명인 경우 마스킹
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      const value = maskedObj[key];
      if (value) {
        maskedObj[key] = typeof value === 'string'
          ? '***마스킹됨***'
          : (typeof value === 'boolean' ? value : '***마스킹됨***');
      }
    }
    // 중첩된 객체는 재귀적으로 마스킹
    else if (typeof maskedObj[key] === 'object' && maskedObj[key] !== null) {
      maskedObj[key] = maskSensitiveData(maskedObj[key]);
    }
    // 문자열 값은 민감한 패턴 검사
    else if (typeof maskedObj[key] === 'string') {
      maskedObj[key] = maskSensitiveText(maskedObj[key]);
    }
  }
  
  return maskedObj;
}

/**
 * 안전한 로깅 함수 - console.log의 안전한 대체 함수
 * 민감한 정보를 자동으로 마스킹합니다.
 */
export function safeLog(...args: any[]): void {
  // 개발 환경에서만 로깅
  if (process.env.NODE_ENV === 'production') {
    // 프로덕션 환경에서는 중요 로그 숨김
    return;
  }
  
  // 각 인자를 마스킹하여 안전하게 로깅
  const maskedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return maskSensitiveText(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return maskSensitiveData(arg);
    }
    return arg;
  });
  
  console.log(...maskedArgs);
}

/**
 * 안전한 에러 로깅 함수 - console.error의 안전한 대체 함수
 * 민감한 정보를 자동으로 마스킹합니다.
 */
export function safeError(...args: any[]): void {
  // 각 인자를 마스킹하여 안전하게 로깅
  const maskedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return maskSensitiveText(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return maskSensitiveData(arg);
    }
    return arg;
  });
  
  console.error(...maskedArgs);
}

/**
 * 안전한 경고 로깅 함수 - console.warn의 안전한 대체 함수
 * 민감한 정보를 자동으로 마스킹합니다.
 */
export function safeWarn(...args: any[]): void {
  // 각 인자를 마스킹하여 안전하게 로깅
  const maskedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      return maskSensitiveText(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return maskSensitiveData(arg);
    }
    return arg;
  });
  
  console.warn(...maskedArgs);
}

/**
 * 기존 console 객체의 로깅 메서드를 안전한 버전으로 오버라이드합니다.
 * 
 * 주의: 이 함수는 전역 console 객체를 수정하므로, 
 * 애플리케이션 시작 시 한 번만 호출해야 합니다.
 */
export function setupSecureLogging(): void {
  if (typeof window !== 'undefined') {
    // 브라우저 환경에서만 실행
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // console.log 오버라이드
    console.log = function(...args: any[]) {
      const maskedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return maskSensitiveText(arg);
        } else if (typeof arg === 'object' && arg !== null) {
          return maskSensitiveData(arg);
        }
        return arg;
      });
      
      originalConsoleLog.apply(console, maskedArgs);
    };
    
    // console.error 오버라이드
    console.error = function(...args: any[]) {
      const maskedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return maskSensitiveText(arg);
        } else if (typeof arg === 'object' && arg !== null) {
          return maskSensitiveData(arg);
        }
        return arg;
      });
      
      originalConsoleError.apply(console, maskedArgs);
    };
    
    // console.warn 오버라이드
    console.warn = function(...args: any[]) {
      const maskedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return maskSensitiveText(arg);
        } else if (typeof arg === 'object' && arg !== null) {
          return maskSensitiveData(arg);
        }
        return arg;
      });
      
      originalConsoleWarn.apply(console, maskedArgs);
    };
    
    // 설치 완료 메시지
    originalConsoleLog.call(console, '안전한 로깅 시스템이 설정되었습니다.');
  }
} 