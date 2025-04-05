/**
 * LogManager.ts
 * 
 * SPA에서 페이지 전환 시 콘솔 로그를 효율적으로 관리하는 중앙 로깅 시스템
 * Unsplash와 같이 깔끔한 로그 관리를 위해 설계됨
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogModule = 'core' | 'api' | 'comments' | 'likes' | 'auth' | 'ui' | 'perf' | 'router' | 'error';

export interface LogOptions {
  module: LogModule;
  data?: any;
  page?: string; // 로그가 생성된 페이지
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: LogModule;
  message: string;
  data?: any;
  page?: string; // 로그가 생성된 페이지
}

// 싱글톤 로그 관리자
class LogManager {
  private static instance: LogManager;
  private logs: LogEntry[] = [];
  private currentPage: string = 'unknown';
  private isSilenced: boolean = false;
  private maxLogsPerPage: number = 100; // 페이지당 최대 로그 수
  private logsPerPage: Record<string, LogEntry[]> = {}; // 페이지별 로그 저장소
  private enabledModules: Set<LogModule> = new Set(['core', 'api', 'router', 'error']);
  
  private constructor() {
    if (typeof window !== 'undefined') {
      // 개발 모드에서만 로깅 활성화
      this.isSilenced = process.env.NODE_ENV === 'production';
    }
  }
  
  public static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }
  
  // 현재 페이지 설정
  public setCurrentPage(pageName: string): void {
    // 페이지가 변경될 때만 로그 초기화
    if (this.currentPage !== pageName) {
      this.currentPage = pageName;
      
      // 페이지 전환 시 새 페이지에 대한 로그 배열 초기화
      if (!this.logsPerPage[pageName]) {
        this.logsPerPage[pageName] = [];
      }
      
      console.log(`🌐 페이지 전환: ${pageName}`);
    }
  }
  
  // 로그 음소거 설정
  public setSilenced(silenced: boolean): void {
    this.isSilenced = silenced;
  }
  
  // 특정 모듈 로깅 활성화
  public enableModule(module: LogModule): void {
    this.enabledModules.add(module);
  }
  
  // 특정 모듈 로깅 비활성화
  public disableModule(module: LogModule): void {
    this.enabledModules.delete(module);
  }
  
  // 특정 모듈의 로깅 활성화 여부 확인
  public isModuleEnabled(module: LogModule): boolean {
    return this.enabledModules.has(module);
  }
  
  // 로그 항목 추가
  private addLogEntry(level: LogLevel, message: string, options?: LogOptions): void {
    const module = options?.module || 'core';
    
    // 설정에 따라 로그 무시
    if (this.isSilenced || !this.enabledModules.has(module)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      message,
      data: options?.data,
      page: this.currentPage,
    };
    
    // 글로벌 로그 배열에 추가
    this.logs.push(entry);
    
    // 현재 페이지 로그 배열에 추가
    if (!this.logsPerPage[this.currentPage]) {
      this.logsPerPage[this.currentPage] = [];
    }
    
    this.logsPerPage[this.currentPage].push(entry);
    
    // 페이지당 로그 수 제한
    if (this.logsPerPage[this.currentPage].length > this.maxLogsPerPage) {
      this.logsPerPage[this.currentPage].shift(); // 가장 오래된 로그 제거
    }
    
    // 개발 모드에서 console에도 출력
    if (process.env.NODE_ENV !== 'production') {
      this.logToConsole(level, message, options);
    }
  }
  
  // console에 로그 출력
  private logToConsole(level: LogLevel, message: string, options?: LogOptions): void {
    const prefix = `[${options?.module || 'core'}] ${this.currentPage ? `[${this.currentPage}]` : ''}`;
    
    switch (level) {
      case 'debug':
        console.debug(`🔍 ${prefix} ${message}`, options?.data || '');
        break;
      case 'info':
        console.info(`ℹ️ ${prefix} ${message}`, options?.data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`, options?.data || '');
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`, options?.data || '');
        break;
    }
  }
  
  // 디버그 레벨 로그
  public debug(message: string, options?: LogOptions): void {
    this.addLogEntry('debug', message, options);
  }
  
  // 정보 레벨 로그
  public info(message: string, options?: LogOptions): void {
    this.addLogEntry('info', message, options);
  }
  
  // 경고 레벨 로그
  public warn(message: string, options?: LogOptions): void {
    this.addLogEntry('warn', message, options);
  }
  
  // 에러 레벨 로그
  public error(message: string, options?: LogOptions): void {
    this.addLogEntry('error', message, options);
  }
  
  // 성능 로그 (퍼포먼스 측정)
  public perf(message: string, options?: LogOptions): void {
    this.addLogEntry('debug', `⏱️ ${message}`, {
      ...options,
      module: 'perf',
    });
  }
  
  // 모든 로그 기록 가져오기
  public getLogHistory(): LogEntry[] {
    return [...this.logs];
  }
  
  // 현재 페이지의 로그 기록만 가져오기
  public getCurrentPageLogs(): LogEntry[] {
    return this.logsPerPage[this.currentPage] || [];
  }
  
  // 특정 페이지의 로그 기록 가져오기
  public getPageLogs(pageName: string): LogEntry[] {
    return this.logsPerPage[pageName] || [];
  }
  
  // 특정 모듈의 로그만 필터링하여 가져오기
  public getModuleLogs(module: LogModule): LogEntry[] {
    return this.logs.filter(log => log.module === module);
  }
  
  // 특정 페이지의 특정 모듈 로그 가져오기
  public getPageModuleLogs(pageName: string, module: LogModule): LogEntry[] {
    return (this.logsPerPage[pageName] || []).filter(log => log.module === module);
  }
  
  // 로그 정리 - 오래된 로그 제거
  public pruneLogs(maxAge: number = 3600000): void { // 기본 1시간
    const now = Date.now();
    this.logs = this.logs.filter(log => now - log.timestamp < maxAge);
    
    // 페이지별 로그도 정리
    Object.keys(this.logsPerPage).forEach(page => {
      this.logsPerPage[page] = this.logsPerPage[page].filter(log => now - log.timestamp < maxAge);
    });
  }
  
  // 전체 로그 초기화
  public clearAllLogs(): void {
    this.logs = [];
    this.logsPerPage = {};
  }
  
  // 현재 페이지 로그만 초기화
  public clearCurrentPageLogs(): void {
    this.logsPerPage[this.currentPage] = [];
    // 글로벌 로그에서도 현재 페이지 로그 제거
    this.logs = this.logs.filter(log => log.page !== this.currentPage);
  }
  
  // 특정 페이지 로그 초기화
  public clearPageLogs(pageName: string): void {
    this.logsPerPage[pageName] = [];
    // 글로벌 로그에서도 해당 페이지 로그 제거
    this.logs = this.logs.filter(log => log.page !== pageName);
  }
}

// 싱글톤 인스턴스
export const logManager = LogManager.getInstance();

// 페이지 전환 시 호출할 함수들
export function onRouteChangeStart(): void {
  logManager.info('페이지 전환 시작', { module: 'router' });
}

export function onRouteChangeComplete(path: string): void {
  // 경로에서 페이지 이름 추출
  const pageName = path === '/' 
    ? '홈' 
    : path.startsWith('/community') 
      ? '커뮤니티' 
      : path.split('/').pop() || '알 수 없음';
  
  logManager.setCurrentPage(pageName);
  logManager.info(`페이지 전환 완료: ${path}`, { module: 'router' });
} 