"use client";

import { useEffect, useState } from "react";

export function BlobAnimation() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 via-transparent to-purple-50/10" />
      
      {/* 블롭 1 */}
      <div className="absolute left-[10%] top-[20%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-gradient-to-r from-blue-100/15 to-purple-100/15 rounded-full blur-[100px] animate-blob" />
      
      {/* 블롭 2 */}
      <div className="absolute right-[10%] bottom-[20%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-gradient-to-l from-purple-100/15 to-blue-100/15 rounded-full blur-[80px] animate-blob animation-delay-3000" />
    </div>
  );
} 