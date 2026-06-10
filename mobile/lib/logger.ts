/**
 * @file lib/logger.ts
 * @description 구조화된 로깅 유틸리티
 *
 * 레벨별 동작:
 * - debug: 개발 환경에서만 콘솔 출력 (프로덕션에서 완전 무시)
 * - info:  콘솔 출력 + Sentry breadcrumb (에러 발생 시 맥락 추적용)
 * - warn:  콘솔 경고 + Sentry breadcrumb
 * - error: 콘솔 에러 + Sentry에 예외/메시지 즉시 전송
 *
 * Breadcrumb은 Sentry 에러 리포트의 "이전 이벤트 타임라인"에 표시된다.
 * logger.info로 핵심 액션을 기록해두면 에러 발생 경위를 역추적할 수 있다.
 */

import * as Sentry from '@sentry/react-native';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  debug(msg: string, data?: unknown) {
    if (isDev) console.log(`[DEBUG] ${msg}`, data ?? '');
  },

  info(msg: string, data?: unknown) {
    if (isDev) console.info(`[INFO] ${msg}`, data ?? '');
    // 프로덕션에서도 Sentry breadcrumb은 항상 기록
    Sentry.addBreadcrumb({
      message: msg,
      level: 'info',
      data: data as Record<string, unknown>,
    });
  },

  warn(msg: string, data?: unknown) {
    console.warn(`[WARN] ${msg}`, data ?? '');
    Sentry.addBreadcrumb({
      message: msg,
      level: 'warning',
      data: data as Record<string, unknown>,
    });
  },

  /**
   * 에러를 Sentry에 즉시 전송한다.
   * Error 객체는 captureException으로 스택트레이스 포함 전송,
   * 그 외 값(문자열, 숫자 등)은 captureMessage로 단순 전송.
   */
  error(msg: string, error?: unknown) {
    console.error(`[ERROR] ${msg}`, error ?? '');
    if (error instanceof Error) {
      Sentry.captureException(error, { extra: { message: msg } });
    } else {
      Sentry.captureMessage(`${msg}${error ? `: ${String(error)}` : ''}`, 'error');
    }
  },
};
