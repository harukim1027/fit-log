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
    // Sentry에 컴포넌트 스택을 함께 전송해 어느 컴포넌트에서 터졌는지 추적
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: info.componentStack ?? '' },
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

    const { primaryColor, dangerColor, bgColor, textPrimaryColor, textSecondaryColor } = this.props;

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
          예상치 못한 오류가 발생했어요.{'\n'}
          개발팀에 자동으로 보고됐어요.
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
 * 실제 사용하는 컴포넌트.
 * useColors()로 현재 테마를 읽어 클래스 컴포넌트에 전달한다.
 * 크래시 화면도 앱 테마(라이트/다크)를 따르도록.
 */
export function ErrorBoundary({
  children,
  onReset,
}: {
  children: React.ReactNode;
  onReset?: () => void;
}) {
  const c = useColors();
  return (
    <ErrorBoundaryClass
      onReset={onReset}
      primaryColor={c.primary}
      dangerColor={c.danger}
      bgColor={c.background}
      textPrimaryColor={c.textPrimary}
      textSecondaryColor={c.textSecondary}>
      {children}
    </ErrorBoundaryClass>
  );
}
