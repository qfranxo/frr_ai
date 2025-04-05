'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { apiLogger, uiLogger, commentsLogger, logManager } from '@/lib/logger';

/**
 * 로그 시스템 활용 예제를 보여주는 컴포넌트
 */
export function LogExample() {
  const [logs, setLogs] = useState<string[]>([]);
  
  // 로그 히스토리 불러오기
  const refreshLogs = () => {
    const history = logManager.getLogHistory();
    const formattedLogs = history.map(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      return `[${timestamp}] [${entry.level}] [${entry.module}] ${entry.message}`;
    });
    setLogs(formattedLogs);
  };
  
  useEffect(() => {
    // 컴포넌트 마운트 시 ui 모듈 로그 출력
    uiLogger.info('LogExample 컴포넌트 마운트됨');
    
    // 3초마다 로그 새로고침
    const interval = setInterval(refreshLogs, 3000);
    
    return () => {
      clearInterval(interval);
      uiLogger.info('LogExample 컴포넌트 언마운트됨');
    };
  }, []);
  
  // API 요청 에뮬레이션
  const simulateApiRequest = async () => {
    uiLogger.info('API 요청 버튼 클릭됨');
    
    apiLogger.info('API 요청 시작');
    
    // 비동기 함수의 실행 시간 측정
    await apiLogger.time('API 요청 완료', async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    });
    
    refreshLogs();
  };
  
  // 댓글 생성 에뮬레이션
  const simulateCommentCreation = () => {
    uiLogger.info('댓글 생성 버튼 클릭됨');
    
    // 성능 측정 타이머 시작
    const endTimer = commentsLogger.startTimer('댓글 생성 성능');
    
    commentsLogger.info('댓글 생성 시작', { postId: 'example-post-123' });
    
    // 1초 후 작업 완료
    setTimeout(() => {
      commentsLogger.info('댓글 생성 완료', { 
        postId: 'example-post-123',
        commentId: 'new-comment-456'
      });
      
      // 타이머 종료 및 성능 로그
      endTimer();
      refreshLogs();
    }, 1000);
  };
  
  // 에러 로깅 예제
  const simulateError = () => {
    uiLogger.info('에러 발생 버튼 클릭됨');
    
    try {
      // 일부러 에러 발생
      throw new Error('의도적으로 발생시킨 예제 에러');
    } catch (error) {
      uiLogger.error('에러 발생', error);
    }
    
    refreshLogs();
  };
  
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card">
      <h3 className="text-lg font-medium mb-4">로그 시스템 예제</h3>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={simulateApiRequest}>
          API 요청 테스트
        </Button>
        <Button onClick={simulateCommentCreation}>
          댓글 생성 테스트
        </Button>
        <Button variant="destructive" onClick={simulateError}>
          에러 로그 테스트
        </Button>
        <Button variant="outline" onClick={refreshLogs}>
          로그 새로고침
        </Button>
      </div>
      
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">로그 히스토리:</h4>
        <div className="bg-muted p-3 rounded-md h-64 overflow-y-auto text-xs font-mono">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className="py-1 border-b border-border last:border-0">
                {log}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">로그가 없습니다. 버튼을 클릭하여 로그를 생성하세요.</p>
          )}
        </div>
      </div>
    </div>
  );
} 