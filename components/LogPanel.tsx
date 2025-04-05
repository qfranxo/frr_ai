'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { logManager, LogLevel, LogModule } from '@/lib/logger';
import { X, HelpCircle, Download, Trash, RefreshCw, SlidersHorizontal } from 'lucide-react';

// 로그 레벨별 색상 정의
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-blue-500',
  info: 'text-green-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
};

// Sheet UI 구현
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Sheet = ({ open, onOpenChange, children }: SheetProps) => {
  useEffect(() => {
    // ESC 키로 시트 닫기
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="fixed inset-0 bg-black/20" 
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
};

const SheetContent = ({ 
  side = 'right', 
  className = '', 
  children 
}: { 
  side?: 'right' | 'left'; 
  className?: string; 
  children: React.ReactNode 
}) => {
  return (
    <div 
      className={`
        relative h-full bg-background shadow-lg flex flex-col w-full 
        sm:max-w-md md:max-w-lg lg:max-w-xl p-0 
        ${side === 'right' ? 'ml-auto' : 'mr-auto'} 
        ${className}
      `}
    >
      {children}
    </div>
  );
};

const SheetHeader = ({ className = '', children }: { className?: string; children: React.ReactNode }) => {
  return <div className={`p-4 ${className}`}>{children}</div>;
};

const SheetTitle = ({ children }: { children: React.ReactNode }) => {
  return <h3 className="text-lg font-semibold">{children}</h3>;
};

// 로그 패널 속성
interface LogPanelProps {
  // 패널이 기본적으로 보일지 여부
  defaultOpen?: boolean;
  // 로그 자동 새로고침 간격 (ms)
  refreshInterval?: number;
  // 현재 페이지 이름
  currentPage?: string;
}

export function LogPanel({ 
  defaultOpen = false, 
  refreshInterval = 3000,
  currentPage
}: LogPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [logs, setLogs] = useState<ReturnType<typeof logManager.getCurrentPageLogs>>([]);
  const [selectedModule, setSelectedModule] = useState<LogModule | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [viewMode, setViewMode] = useState<'current' | 'all'>('current');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // 로그 새로고침 함수
  const refreshLogs = () => {
    let filteredLogs = viewMode === 'current' 
      ? logManager.getCurrentPageLogs() 
      : logManager.getLogHistory();
    
    // 모듈 필터링
    if (selectedModule !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.module === selectedModule);
    }
    
    // 레벨 필터링
    if (selectedLevel !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === selectedLevel);
    }
    
    // 최신 로그가 상단에 오도록 정렬
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    setLogs(filteredLogs);
  };
  
  // 현재 페이지 로그 초기화
  const clearCurrentPageLogs = () => {
    if (window.confirm('현재 페이지의 로그를 모두 삭제하시겠습니까?')) {
      logManager.clearCurrentPageLogs();
      refreshLogs();
    }
  };
  
  // 모든 로그 초기화
  const clearAllLogs = () => {
    if (window.confirm('모든 로그를 삭제하시겠습니까?')) {
      logManager.clearAllLogs();
      refreshLogs();
    }
  };
  
  // 로그 파일 다운로드
  const downloadLogs = () => {
    const logText = logs.map(log => {
      const time = new Date(log.timestamp).toISOString();
      const page = log.page || 'unknown';
      return `[${time}] [${log.level.toUpperCase()}] [${log.module}] [${page}] ${log.message}${
        log.data ? ` | Data: ${JSON.stringify(log.data)}` : ''
      }`;
    }).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 패널 열기/닫기 토글
  const togglePanel = () => {
    setIsOpen(prev => !prev);
  };
  
  // 자동 새로고침 토글
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };
  
  // 뷰 모드 전환 (현재 페이지 / 전체)
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'current' ? 'all' : 'current');
    // 모드 변경 시 바로 새로고침
    setTimeout(refreshLogs, 0);
  };
  
  // 로그 레벨 선택 핸들러
  const handleLevelChange = (level: LogLevel | 'all') => {
    setSelectedLevel(level);
    // 선택 변경 시 바로 새로고침
    setTimeout(refreshLogs, 0);
  };
  
  // 로그 모듈 선택 핸들러
  const handleModuleChange = (module: LogModule | 'all') => {
    setSelectedModule(module);
    // 선택 변경 시 바로 새로고침
    setTimeout(refreshLogs, 0);
  };
  
  // 컴포넌트 마운트 시 로그 로드 및 주기적 새로고침 설정
  useEffect(() => {
    refreshLogs();
    
    let interval: NodeJS.Timeout | null = null;
    
    if (autoRefresh) {
      interval = setInterval(refreshLogs, refreshInterval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshInterval, selectedModule, selectedLevel, viewMode, autoRefresh]);
  
  // 패널이 열려 있을 때만 로그 갱신
  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen]);
  
  return (
    <>
      {/* 패널 트리거 버튼 - 항상 화면 우측 하단에 표시 */}
      <Button 
        variant="outline" 
        size="icon" 
        className="fixed bottom-4 right-4 z-50 shadow-md rounded-full bg-background"
        onClick={togglePanel}
      >
        {isOpen ? <X size={16} /> : <HelpCircle size={16} />}
      </Button>
      
      {/* 로그 패널 */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col"
        >
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>
                {viewMode === 'current' ? '현재 페이지 로그' : '전체 로그'}
              </SheetTitle>
              <div className="flex gap-2">
                <Button 
                  variant={autoRefresh ? "default" : "outline"} 
                  size="icon" 
                  onClick={toggleAutoRefresh}
                  title={autoRefresh ? "자동 새로고침 중지" : "자동 새로고침 시작"}
                >
                  <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={downloadLogs}
                  title="로그 다운로드"
                >
                  <Download size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={viewMode === 'current' ? clearCurrentPageLogs : clearAllLogs}
                  title="로그 초기화"
                >
                  <Trash size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsOpen(false)}
                  title="닫기"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
            
            {/* 필터 옵션 */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button 
                variant={viewMode === 'current' ? "default" : "outline"} 
                size="sm" 
                onClick={toggleViewMode}
                className="text-xs"
              >
                {viewMode === 'current' ? '현재 페이지 로그' : '전체 로그'}
              </Button>
              
              <div className="flex gap-1 ml-auto">
                <div className="flex items-center space-x-1">
                  <Button 
                    variant={selectedLevel === 'all' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleLevelChange('all')}
                    className="text-xs h-8"
                  >
                    전체
                  </Button>
                  <Button 
                    variant={selectedLevel === 'debug' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleLevelChange('debug')}
                    className="text-xs h-8 text-blue-500"
                  >
                    디버그
                  </Button>
                  <Button 
                    variant={selectedLevel === 'info' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleLevelChange('info')}
                    className="text-xs h-8 text-green-500"
                  >
                    정보
                  </Button>
                  <Button 
                    variant={selectedLevel === 'warn' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleLevelChange('warn')}
                    className="text-xs h-8 text-yellow-500"
                  >
                    경고
                  </Button>
                  <Button 
                    variant={selectedLevel === 'error' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => handleLevelChange('error')}
                    className="text-xs h-8 text-red-500"
                  >
                    에러
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 w-full mt-2">
                <Button 
                  variant={selectedModule === 'all' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('all')}
                  className="text-xs h-7"
                >
                  모든 모듈
                </Button>
                <Button 
                  variant={selectedModule === 'core' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('core')}
                  className="text-xs h-7"
                >
                  Core
                </Button>
                <Button 
                  variant={selectedModule === 'api' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('api')}
                  className="text-xs h-7"
                >
                  API
                </Button>
                <Button 
                  variant={selectedModule === 'router' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('router')}
                  className="text-xs h-7"
                >
                  Router
                </Button>
                <Button 
                  variant={selectedModule === 'comments' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('comments')}
                  className="text-xs h-7"
                >
                  Comments
                </Button>
                <Button 
                  variant={selectedModule === 'auth' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('auth')}
                  className="text-xs h-7"
                >
                  Auth
                </Button>
                <Button 
                  variant={selectedModule === 'ui' ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => handleModuleChange('ui')}
                  className="text-xs h-7"
                >
                  UI
                </Button>
              </div>
            </div>
          </SheetHeader>
          
          {/* 로그 표시 영역 */}
          <div className="flex-grow overflow-auto bg-muted/20 text-xs font-mono p-0">
            {logs.length > 0 ? (
              <div className="divide-y divide-border/30">
                {logs.map((log, index) => (
                  <div key={index} className="p-2 hover:bg-muted/40">
                    <div className="flex items-start">
                      <span className="whitespace-nowrap text-muted-foreground mr-2">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`font-semibold ${LOG_LEVEL_COLORS[log.level]} uppercase mr-2`}>
                        {log.level}
                      </span>
                      <span className="bg-primary/10 text-primary px-1 rounded mr-2">
                        {log.module}
                      </span>
                      {viewMode === 'all' && log.page && (
                        <span className="bg-secondary/10 text-secondary px-1 rounded mr-2">
                          {log.page}
                        </span>
                      )}
                      <span className="font-medium flex-grow break-words">
                        {log.message}
                      </span>
                    </div>
                    
                    {log.data && (
                      <div className="mt-1 pl-6 text-muted-foreground break-words">
                        {typeof log.data === 'object' 
                          ? JSON.stringify(log.data, null, 2)
                          : String(log.data)
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                로그가 없습니다
              </div>
            )}
          </div>
          
          {/* 상태 표시줄 */}
          <div className="px-4 py-2 border-t text-xs text-muted-foreground flex justify-between items-center">
            <div>총 {logs.length}개의 로그</div>
            <div>마지막 업데이트: {new Date().toLocaleTimeString()}</div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
} 