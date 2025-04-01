import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// CSR 전용 컴포넌트를 dynamic import로 분리
const ClientUI = dynamic(() => import('./ClientUI'), {
  ssr: false,
  loading: () => <div className="h-10 animate-pulse bg-gray-200" />
});

export default function ExampleComponent() {
  const [isReady, setIsReady] = useState(false);
  const initialDate = new Date(process.env.NEXT_PUBLIC_BUILD_TIME!);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {isReady ? initialDate.toLocaleDateString() : 'Loading...'}
      </h1>
      
      {isReady && <ClientUI />}
    </div>
  );
} 