import { StyleOption, Option } from '@/types/generate';

export const MODEL_STYLES: StyleOption[] = [
  {
    id: 'high-fashion',
    name: 'High Fashion',
    icon: '👗',
    description: '럭셔리하고 세련된 하이엔드 패션 감성'
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: '💼',
    description: '신뢰감 있는 비즈니스 프로페셔널 룩'
  },
  {
    id: 'natural',
    name: 'Natural',
    icon: '🌿',
    description: '자연스럽고 친근한 일상적인 스타일'
  },
  {
    id: 'modern-chic',
    name: 'Modern Chic',
    icon: '🕶️',
    description: '세련되고 도시적인 현대적 감성'
  },
  {
    id: 'artistic',
    name: 'Artistic',
    icon: '🎨',
    description: '독창적이고 예술적인 감각의 스타일'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    icon: '◻️',
    description: '깔끔하고 절제된 심플한 스타일'
  }
];

export const AGE_RANGES: Option[] = [
  { id: 'young', name: '20~30대', icon: '✨' },
  { id: 'middle', name: '40~60대', icon: '💫' },
  { id: 'senior', name: '70대 이상', icon: '⭐' }
];

export const GENDER_OPTIONS: Option[] = [
  { id: 'female', name: '여성', icon: '👩' },
  { id: 'male', name: '남성', icon: '👨' }
]; 