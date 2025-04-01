import Header from "./Header";
import { BlobAnimation } from "../ui/blob-animation";
import { ILayout } from '@/types';

export default function Layout({ children }: ILayout) {
  return (
    <div className="min-h-screen">
      <div className="relative z-10">
        <Header />
        <main className="pt-16">{children}</main>
      </div>
    </div>
  );
} 