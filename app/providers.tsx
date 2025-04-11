import { ClerkProvider } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import ToasterProvider from '@/components/providers/ToasterProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  // React Query 클라이언트를 컴포넌트 내부에서 인스턴스화
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 1분
        gcTime: 300000, // 5분 (이전의 cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <ClerkProvider
      appearance={{
        variables: { 
          colorPrimary: '#2563eb',
          colorTextOnPrimaryBackground: '#fff'
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <ToasterProvider />
      </QueryClientProvider>
    </ClerkProvider>
  )
} 