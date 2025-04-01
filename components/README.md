# 공통 컴포넌트 가이드

## LoadingScreen 컴포넌트

재사용 가능한 로딩 화면 컴포넌트입니다. 다양한 페이지에서 로딩 상태를 표시할 때 사용할 수 있습니다.

### 사용법

```tsx
import LoadingScreen from '@/components/shared/LoadingScreen';

// 기본 사용법
<LoadingScreen />

// 다양한 옵션을 적용한 사용법
<LoadingScreen
  message="데이터를 불러오는 중"
  subMessage="잠시만 기다려주세요..."
  type="spinner"
  size="md"
  bgGradient={true}
/>
```

### Props

| 프로퍼티 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| message | string | 'Loading' | 메인 로딩 메시지 |
| subMessage | string | 'Please wait...' | 부가 설명 메시지 |
| type | 'spinner' \| 'skeleton' \| 'pulse' | 'spinner' | 로딩 애니메이션 타입 |
| className | string | '' | 추가 CSS 클래스 |
| bgGradient | boolean | true | 배경 그라데이션 사용 여부 |
| size | 'sm' \| 'md' \| 'lg' | 'md' | 로딩 요소 크기 |

### 로딩 타입

- **spinner**: 회전하는 원형 스피너 애니메이션
- **skeleton**: 스켈레톤 UI 애니메이션
- **pulse**: 맥동하는 점 애니메이션

### 크기 옵션

- **sm**: 작은 크기 (모바일 최적화)
- **md**: 중간 크기 (기본)
- **lg**: 큰 크기 (데스크톱 최적화)

### 사용 예시

**계정 페이지 로딩:**
```tsx
if (!isLoaded || isLoading) {
  return (
    <LoadingScreen
      message="계정 정보를 불러오는 중"
      subMessage="계정 정보를 불러오는 동안 잠시만 기다려주세요..."
      type="spinner"
      size="md"
    />
  );
}
```

**커뮤니티 페이지 로딩:**
```tsx
if (isLoading) {
  return (
    <LoadingScreen
      message="갤러리를 불러오는 중"
      subMessage="최신 이미지를 불러오는 중입니다..."
      type="skeleton"
      size="lg"
    />
  );
}
``` 