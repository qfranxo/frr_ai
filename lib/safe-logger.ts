/**
 * 안전한 로깅을 위한 유틸리티 함수
 * 민감한 정보를 마스킹하여 로깅할 수 있도록 도와줍니다.
 */

// 민감한 필드 목록
const SENSITIVE_FIELDS = [
  'userId', 'user_id', 'id', 
  'userName', 'user_name', 'name', 'firstName', 'lastName',
  'email', 'password', 'token',
  'userImage', 'imageUrl', 'profileImage',
  'phone', 'address', 'birthdate'
];

/**
 * 객체에서 민감한 정보를 마스킹합니다.
 * @param obj 마스킹할 객체
 * @returns 민감한 정보가 마스킹된 객체
 */
export function maskSensitiveData<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const maskedObj = { ...obj };
  
  for (const key in maskedObj) {
    if (SENSITIVE_FIELDS.includes(key)) {
      // 민감한 필드는 값이 있는지 여부만 표시
      const hasValue = !!maskedObj[key];
      maskedObj[key] = hasValue ? '***마스킹됨***' : null;
    } else if (typeof maskedObj[key] === 'object' && maskedObj[key] !== null) {
      // 중첩된 객체도 재귀적으로 마스킹
      maskedObj[key] = maskSensitiveData(maskedObj[key]);
    }
  }
  
  return maskedObj;
}

/**
 * 안전하게 로깅하는 함수
 * 민감한 정보를 마스킹하여 콘솔에 로깅합니다.
 * @param message 로그 메시지
 * @param data 로깅할 데이터 (객체)
 */
export function safeLog(message: string, data?: Record<string, any>): void {
  if (!data) {
    console.log(message);
    return;
  }
  
  const maskedData = maskSensitiveData(data);
  console.log(message, maskedData);
}

/**
 * 안전하게 에러를 로깅하는 함수
 * 민감한 정보를 마스킹하여 콘솔에 에러를 로깅합니다.
 * @param message 에러 메시지
 * @param error 에러 객체
 * @param data 추가 데이터 (객체)
 */
export function safeErrorLog(message: string, error: unknown, data?: Record<string, any>): void {
  if (!data) {
    console.error(message, error);
    return;
  }
  
  const maskedData = maskSensitiveData(data);
  console.error(message, error, maskedData);
}

/**
 * UUID 마스킹 함수
 * UUID의 일부만 표시하고 나머지는 마스킹합니다.
 * @param uuid 마스킹할 UUID
 * @returns 마스킹된 UUID (예: "f77a6***")
 */
export function maskUUID(uuid: string): string {
  if (!uuid) return '';
  if (typeof uuid !== 'string') return '***';
  
  // UUID의 처음 5자만 표시하고 나머지는 마스킹
  return uuid.substring(0, 5) + '***';
} 