import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 클래스네임 유틸리티 함수
 * clsx와 tailwind-merge를 결합하여 클래스 충돌을 방지합니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
