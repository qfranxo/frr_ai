import Header from "./Header";
import { BlobAnimation } from "../ui/blob-animation";
import { ILayout } from '@/types';

export default function Layout({ children }: ILayout) {
  return (
    <div className="min-h-screen">
      <div className="relative z-10">
        <Header />
        <main className="pt-16">{children}</main>
        {/* Footer는 app/layout.tsx의 ClientFooter에서 관리하므로 여기서는 제거 */}
      </div>
    </div>
  );
} 