import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import { WS_BASE_URL } from '../config/dev';
import { handleIncomingEvent } from '../lib/reportEventHandlers';

// WebSocket Context 타입 정의
interface WebSocketContextType {
  send: (message: any) => void;
}

// Context 생성 (export 추가)
export const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Provider Props 타입
interface WebSocketProviderProps {
  userId: string;
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ userId, children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const appStateRef = useRef<string>(AppState.currentState);
  const appStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3초

  useEffect(() => {
    // userId가 없으면 연결하지 않음
    if (!userId) {
      console.warn('WebSocketProvider: userId가 제공되지 않았습니다.');
      return;
    }

  // 앱 상태 관찰: 백그라운드에서 재연결/연결 유지로 인한 소음과 오류를 방지

    const connect = () => {
      // only attempt if app is active
      if (appStateRef.current !== 'active') {
        console.log('[WebSocket] 앱이 포그라운드가 아니므로 연결을 시도하지 않습니다:', appStateRef.current);
        return;
      }

      // WebSocket 연결 생성
      const wsUrl = `${WS_BASE_URL}/ws/${userId}`;
      console.log(`🔌 WebSocket 연결 시도 (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts}): ${wsUrl}`);

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        // 연결 성공
        ws.onopen = () => {
          console.log(`✅ WebSocket 연결 성공: userId=${userId}`);
          reconnectAttemptsRef.current = 0; // 재연결 카운터 리셋
        };

        // 메시지 수신
        ws.onmessage = (event) => {
          try {
            console.log('\n========== 📨 WebSocket 메시지 수신 ==========');
            console.log('1️⃣ Raw event:', event);
            console.log('2️⃣ event.data:', event.data);
            console.log('3️⃣ Type of event.data:', typeof event.data);

            // undefined 체크
            if (event.data === undefined) {
              console.error('❌ event.data가 undefined입니다!');
              return;
            }

            if (typeof event.data === 'string' && event.data.trim() === '') {
              console.error('❌ event.data가 빈 문자열입니다!');
              return;
            }

            const data = JSON.parse(event.data);
            console.log('4️⃣ Parsed data:', data);
            console.log('5️⃣ JSON.stringify:', JSON.stringify(data, null, 2));
            console.log('6️⃣ data.eventType:', data.eventType);
            console.log('7️⃣ data.reportId:', data.reportId);
            console.log('8️⃣ Object.keys(data):', Object.keys(data));
            console.log('============================================\n');

            // handleIncomingEvent 호출 (reportEventHandlers.ts)
            handleIncomingEvent(data);
          } catch (error) {
            console.error('❌ WebSocket 메시지 처리 실패:', error);
            console.error('   - 원본 event:', event);
            console.error('   - event.data:', event.data);
            console.error('   - error stack:', error);
          }
        };

        // 에러 처리
        ws.onerror = (error: any) => {
          console.error('❌ WebSocket 에러:', error);
          console.error('   - isTrusted:', error.isTrusted);
          console.error('   - message:', error.message);
          console.error('   - type:', error.type);
        };

        // 연결 종료 (재연결 시도)
        ws.onclose = (event) => {
          console.log(`🔌 WebSocket 연결 종료: code=${event.code}, reason=${event.reason || '없음'}`);
          wsRef.current = null;

          // 재연결 시도 (최대 횟수 내에서만)
          if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            console.log(`🔄 ${reconnectDelay / 1000}초 후 재연결 시도... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectDelay);
          } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.warn('⚠️ WebSocket 최대 재연결 횟수 초과. 재연결을 중단합니다.');
          }
        };
      } catch (error) {
        console.error('❌ WebSocket 생성 실패:', error);
      }
    };

    // AppState 변경에 따라 연결/종료 제어
    const handleAppStateChange = (nextState: any) => {
      console.log('[WebSocket] AppState 변경:', nextState);
      // 임시적인 상태 변화(예: 개발자 메뉴, 포커스 전환)로 인해 즉시 소켓을 닫지 않도록
      // 짧은 지연을 두고 실제로 비활성 상태가 지속되면 소켓을 닫습니다.
      appStateRef.current = nextState;

      // 포그라운드 복귀 시: 타이머 취소하고 연결 재시도
      if (nextState === 'active') {
        if (appStateTimeoutRef.current) {
          clearTimeout(appStateTimeoutRef.current);
          appStateTimeoutRef.current = null;
        }
        shouldReconnectRef.current = true;
        // 포그라운드로 돌아오면 연결 시도
        if (!wsRef.current) connect();
        return;
      }

      // 포그라운드가 아니게 되면 즉시 닫지 말고 짧은 지연 후 닫기
      shouldReconnectRef.current = false;
      if (appStateTimeoutRef.current) {
        clearTimeout(appStateTimeoutRef.current);
      }
      appStateTimeoutRef.current = setTimeout(() => {
        // 여전히 백그라운드 상태라면 소켓 닫기
        if (appStateRef.current !== 'active') {
          if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            console.log('[WebSocket] 앱이 백그라운드 상태가 지속되어 소켓을 닫습니다.');
            wsRef.current.close();
          }
        }
        appStateTimeoutRef.current = null;
      }, 1000); // 1초 대기
    };

    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    // 초기 연결 (포그라운드일 때만)
    if (AppState.currentState === 'active') connect();

    // 클린업: 컴포넌트 언마운트 시 WebSocket 종료 및 AppState 리스너 제거
    return () => {
      try { appStateListener.remove(); } catch (e) { /* ignore */ }
      shouldReconnectRef.current = false; // 재연결 중단
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log('🔌 WebSocket 연결 종료 중...');
        wsRef.current.close();
      }
    };
  }, [userId]);

  // 메시지 전송 함수
  const send = (message: any) => {
    console.log('📤 [send 함수 호출됨]');
    console.log('   - wsRef.current 존재:', !!wsRef.current);
    console.log('   - readyState:', wsRef.current?.readyState);
    console.log('   - message:', message);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const payload = typeof message === 'string' ? message : JSON.stringify(message);
        console.log('📤 [실제 전송] payload:', payload);
        wsRef.current.send(payload);
        console.log('✅ [전송 성공]');
      } catch (error) {
        console.error('❌ [전송 실패]:', error);
      }
    } else {
      const stateMap: { [key: number]: string } = {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      };
      const stateName = wsRef.current ? stateMap[wsRef.current.readyState] : 'NULL';
      console.warn(`⚠️ WebSocket이 연결되지 않았습니다. readyState: ${wsRef.current?.readyState} (${stateName})`);
    }
  };

  const contextValue: WebSocketContextType = {
    send,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom Hook: 하위 컴포넌트에서 WebSocket을 사용하기 위한 훅
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket은 WebSocketProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};
