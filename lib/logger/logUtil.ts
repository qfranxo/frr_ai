import { logManager, LogModule } from './LogManager';

/**
 * 특정 모듈에 대한 로깅 유틸리티를 생성합니다.
 * 미리 모듈을 지정해서 매번 module 파라미터를 전달할 필요가 없게 합니다.
 */
export const createLogger = (module: LogModule) => {
  return {
    /**
     * 디버그 로그를 출력합니다.
     */
    debug: (message: string, data?: any) => {
      logManager.debug(message, { module, data });
    },
    
    /**
     * 정보 로그를 출력합니다.
     */
    info: (message: string, data?: any) => {
      logManager.info(message, { module, data });
    },
    
    /**
     * 경고 로그를 출력합니다.
     */
    warn: (message: string, data?: any) => {
      logManager.warn(message, { module, data });
    },
    
    /**
     * 에러 로그를 출력합니다.
     */
    error: (message: string, data?: any) => {
      logManager.error(message, { module, data });
    },
    
    /**
     * 성능 측정 로그를 출력합니다.
     */
    perf: (
      message: string, 
      startTime: number, 
      endTime: number = Date.now(), 
      threshold: number = 0
    ) => {
      const duration = endTime - startTime;
      if (duration >= threshold) {
        logManager.info(message, { module, data: { duration } });
      }
    },
    
    /**
     * 성능 측정을 위한 타이머를 시작합니다.
     * 반환된 함수를 호출하면 경과 시간을 측정하고 로그를 출력합니다.
     */
    startTimer: (label: string, threshold: number = 0) => {
      const start = Date.now();
      return () => {
        const end = Date.now();
        const duration = end - start;
        
        if (duration >= threshold) {
          logManager.info(`${label} - ${duration}ms`, { 
            module, 
            data: { duration, label } 
          });
        }
        
        return duration;
      };
    },
    
    /**
     * 비동기 함수의 성능을 측정합니다.
     * 함수를 실행하고 실행 시간을 로깅합니다.
     */
    async time<T>(label: string, fn: () => Promise<T>, threshold: number = 0): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        const end = Date.now();
        const duration = end - start;
        
        if (duration >= threshold) {
          logManager.info(`${label} - ${duration}ms`, { 
            module, 
            data: { duration, label } 
          });
        }
        
        return result;
      } catch (error) {
        const end = Date.now();
        logManager.error(`${label} 실행 오류`, { 
          module, 
          data: { 
            error, 
            duration: end - start 
          } 
        });
        throw error;
      }
    },
    
    /**
     * 함수의 성능을 측정합니다.
     * 함수를 실행하고 실행 시간을 로깅합니다.
     */
    timeSync<T>(label: string, fn: () => T, threshold: number = 0): T {
      const start = Date.now();
      try {
        const result = fn();
        const end = Date.now();
        const duration = end - start;
        
        if (duration >= threshold) {
          logManager.info(`${label} - ${duration}ms`, { 
            module, 
            data: { duration, label } 
          });
        }
        
        return result;
      } catch (error) {
        const end = Date.now();
        logManager.error(`${label} 실행 오류`, { 
          module, 
          data: { 
            error, 
            duration: end - start 
          } 
        });
        throw error;
      }
    }
  };
};

/**
 * 쉬운 접근을 위한 기본 로거들
 */
export const apiLogger = createLogger('api');
export const coreLogger = createLogger('core');
export const routerLogger = createLogger('router');
export const uiLogger = createLogger('ui');
export const commentsLogger = createLogger('comments');
export const likesLogger = createLogger('likes');
export const authLogger = createLogger('auth');
export const perfLogger = createLogger('perf'); 