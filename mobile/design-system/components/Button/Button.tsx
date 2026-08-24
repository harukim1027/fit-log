/**
 * @file design-system/components/Button/Button.tsx
 * @description 폼 제출형 주 액션 버튼.
 *
 * ── 범위 ───────────────────────────────────────────────────────────────────
 * 화면 하단 전체 폭 CTA만 담는다. 로그인·회원가입·저장·추가하기처럼
 * "이 화면의 결정을 실행하는" 버튼이다. 기존 components/ui/Button.tsx의
 * 호출부 8곳(6개 파일)이 전부 이 형태다.
 * (초기 조사에서 13곳으로 셌으나 5건은 `Record<ButtonVariant, …>`가
 *  `<Button` 패턴에 걸린 오탐이었다.)
 *
 * 앱의 인라인 터치 요소 231건(칩, 아이콘 버튼, 링크형 텍스트, 알약 버튼)은
 * 담지 않는다. 형태가 제각각이라 한 컴포넌트로 묶으면 prop이 폭발한다.
 * IconButton / Chip 같은 별도 컴포넌트 후보로 남긴다.
 *
 * ── 만들지 않은 것과 사유 ──────────────────────────────────────────────────
 * variant  기존 Button은 primary/secondary/danger/ghost 4종을 노출하지만
 *          8개 호출부에서 variant를 넘기는 곳이 0건이다. 전부 기본값
 *          primary를 쓴다. primary 하나만 남기면 유니온이 무의미하므로
 *          prop 자체를 두지 않는다. 두 번째 형태가 실제로 필요해질 때 추가.
 * size     실사용 0건. 8곳 모두 기본값 md를 쓴다.
 * fullWidth 8곳 중 7곳이 fullWidth를 넘긴다. 나머지 하나(barcode-scan의
 *          "권한 허용")만 좁은 버튼이다. 전체 폭이 기본값이고 그 예외는
 *          style로 오버라이드한다 — NarrowViaStyle 스토리가 그 케이스다.
 * leftIcon / rightIcon
 *          rightIcon 1건, leftIcon 0건. style/children으로 대응한다.
 *
 * ── 스타일 방식 ────────────────────────────────────────────────────────────
 * Card·Section과 같다. 색 없는 정적 수치만 StyleSheet.create로 빼고
 * 테마 의존 색은 인라인 병합한다.
 */
import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors, space, radius, size } from "../../tokens";

export interface ButtonProps {
  /** 라벨. 문자열을 넣으면 body-strong 14/800 onAccent로 렌더된다. */
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** 비동기 대기 중. 라벨이 스피너로 바뀌고 입력이 막힌다. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 스크린리더용 라벨. 없으면 children 문자열이 읽힌다. */
  accessibilityLabel?: string;
  testID?: string;
}

// 색이 없는 정적 수치만. 근거는 DESIGN.md의 radius/space 토큰이다.
// (radius.pill 999 / space.16 / target.min 44)
const styles = StyleSheet.create({
  root: {
    // 전체 폭이 기본값. 좁게 쓰려면 호출부가 style로 alignSelf/width를 준다.
    alignSelf: "stretch",
    minHeight: size.touchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space[16],
    paddingHorizontal: space[16],
    borderRadius: radius.pill,
  },
  // 비활성 시각 처리는 opacity로 한다. 앱 전체에서 색을 교체하는 사례가
  // 0건이고, 기존 Button도 opacity-50을 쓴다.
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: "800" },
});

export function Button({
  children,
  onPress,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const c = useColors();
  const isDisabled = disabled || loading;

  const label =
    typeof children === "string" || typeof children === "number" ? (
      <Text style={[styles.label, { color: c.onAccent }]} numberOfLines={1}>
        {children}
      </Text>
    ) : (
      children
    );

  const readableLabel =
    accessibilityLabel ??
    (typeof children === "string" ? children : undefined);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      // DESIGN.md 규정값. 앱에는 0.7과 0.8이 혼재하지만(113 대 100)
      // 디자인 시스템은 0.7로 고정한다.
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        loading && readableLabel ? `${readableLabel}, 처리 중` : readableLabel
      }
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={[
        styles.root,
        { backgroundColor: c.primary },
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        // 스피너는 접근성 트리에서 숨긴다. 로딩 사실은 이미 버튼의
        // accessibilityLabel("…, 처리 중")과 accessibilityState.busy가 알린다.
        // 숨기지 않으면 이름 없는 progressbar 노드가 하나 더 생긴다
        // (a11y 위반 aria-progressbar-name).
        //
        // 앞의 둘이 iOS 실동작용이고, aria-hidden은 Storybook이 쓰는
        // react-native-web 전용이다. RNW 0.21은 앞의 두 prop을 DOM으로
        // 넘기지 않아 aria-hidden 없이는 웹에서 노드가 그대로 노출된다.
        // (CLAUDE.md의 "aria-* 금지"는 RN에 없는 DOM 속성을 쓰지 말라는
        //  뜻이고, aria-hidden은 RN 0.71+가 정식 지원하는 prop이다.)
        <ActivityIndicator
          color={c.onAccent}
          size="small"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        />
      ) : (
        label
      )}
    </TouchableOpacity>
  );
}
