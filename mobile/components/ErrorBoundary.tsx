/**
 * @file components/ErrorBoundary.tsx
 * @description React 렌더링 중 발생한 예외를 포착하는 에러 바운더리
 *
 * 왜 클래스 컴포넌트인가:
 * - getDerivedStateFromError / componentDidCatch는 클래스 컴포넌트에서만 사용 가능하다.
 *   React 공식 API 제약이므로 함수형으로 대체 불가.
 *
 * 왜 함수형 래퍼(ErrorBoundary)를 만들었나:
 * - 클래스 컴포넌트에서 useColors() 훅을 직접 호출할 수 없다.
 * - 함수형 래퍼가 훅으로 테마 색상을 읽어 props로 전달하는 패턴으로 해결.
 *
 * 에러 발생 시 동작:
 * 1. getDerivedStateFromError → hasError: true (렌더링 중단, 폴백 UI 표시)
 * 2. componentDidCatch → Sentry에 예외 + React 컴포넌트 스택 전송
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useColors } from '../constants/colors';
import { Icon } from './AppIcons';

interface State {
  hasError: boolean;
  eventId?: string;
}

interface ClassProps {
  children: React.ReactNode;
  onReset?: () => void;
  /** 어느 화면에서 터졌는지 — Sentry 태그 + 폴백 문구에 사용 */
  screenName?: string;
  primaryColor: string;
  dangerColor: string;
  bgColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
}

class ErrorBoundaryClass extends React.Component<ClassProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    // 렌더링 단계에서 동기적으로 호출 — 상태 업데이트만 허용, 부작용 금지
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry에 컴포넌트 스택 + 화면 이름을 함께 전송해 어느 화면·컴포넌트에서 터졌는지 추적
    Sentry.captureException(error, {
      tags: { screen: this.props.screenName ?? 'unknown' },
      contexts: {
        react: { componentStack: info.componentStack ?? '' },
        screen: { name: this.props.screenName ?? 'unknown' },
      },
    });
  }

  handleReset = () => {
    // 상태를 초기화해 앱을 다시 렌더링 시도
    // 근본 원인이 해결되지 않았다면 다시 터질 수 있으나, 일시적 오류(네트워크 등)는 복구 가능
    this.setState({ hasError: false, eventId: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children as React.ReactElement;
    }

    const { primaryColor, dangerColor, bgColor, textPrimaryColor, textSecondaryColor, screenName } = this.props;
    // 화면 단위 바운더리면 "다른 탭은 정상"이라는 안심 문구를, 앱 최상단이면 일반 문구를 보여준다.
    const bodyText = screenName
      ? `${screenName} 화면에서 오류가 발생했어요.\n다른 탭은 정상 사용할 수 있어요.\n개발팀에 자동으로 보고됐어요.`
      : '예상치 못한 오류가 발생했어요.\n개발팀에 자동으로 보고됐어요.';

    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: bgColor,
        }}>
        <View style={{ marginBottom: 16 }}>
          <Icon name="closeCircle" size={52} color={dangerColor} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: '900',
            color: textPrimaryColor,
            marginBottom: 8,
          }}>
          문제가 발생했어요
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: textSecondaryColor,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 22,
          }}>
          {bodyText}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: primaryColor,
            borderRadius: 999,
            paddingHorizontal: 32,
            paddingVertical: 14,
          }}
          onPress={this.handleReset}
          activeOpacity={0.8}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>
            다시 시도
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

/**
 * Provides themed error handling for a React component subtree.
 *
 * @param onReset - Callback invoked when the error boundary is reset
 * @param screenName - Optional screen name used to identify the boundary in error reporting and fallback messaging
 */
export function ErrorBoundary({
  children,
  onReset,
  screenName,
}: {
  children: React.ReactNode;
  onReset?: () => void;
  /** 화면별 바운더리로 쓸 때 전달 — Sentry 태그 + 폴백 문구에 반영 */
  screenName?: string;
}) {
  const c = useColors();
  return (
    <ErrorBoundaryClass
      onReset={onReset}
      screenName={screenName}
      primaryColor={c.primary}
      dangerColor={c.danger}
      bgColor={c.background}
      textPrimaryColor={c.textPrimary}
      textSecondaryColor={c.textSecondary}>
      {children}
    </ErrorBoundaryClass>
  );
}
