import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * clsx와 tailwind-merge를 합친 유틸리티 함수
 * 클래스명을 조건부로 결합하고 tailwind 충돌을 해결합니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
