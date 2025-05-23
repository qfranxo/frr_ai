'use client';

import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export default function ToasterProvider() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    return () => {
      setIsMounted(false);
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Toaster 
      position="top-center"
      toastOptions={{
        closeButton: true,
        duration: 3000,
        style: {
          background: '#fff',
          color: '#333',
        }
      }}
      richColors 
      closeButton
    />
  );
} 