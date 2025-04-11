import localFont from 'next/font/local';
import { Inter } from 'next/font/google';

// 기본 Inter 폰트 설정
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Kode Mono 폰트 설정
export const kodeMono = localFont({
  src: [
    {
      path: '../../public/fonts/kode-mono/KodeMono-VariableFont_wght.ttf',
      style: 'normal',
      weight: '100 900',
    },
  ],
  display: 'swap',
  variable: '--font-kode-mono',
});

// Rubik Doodle Shadow 폰트 설정
export const rubikDoodleShadow = localFont({
  src: [
    {
      path: '../../public/fonts/Rubik_Doodle_Shadow/RubikDoodleShadow-Regular.ttf',
      style: 'normal',
      weight: '400',
    },
  ],
  display: 'swap',
  variable: '--font-rubik-doodle-shadow',
}); 