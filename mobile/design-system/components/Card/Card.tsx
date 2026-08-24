/**
 * @file design-system/components/Card/Card.tsx
 * @description Harulog 디자인 시스템의 컨테이너 카드.
 *
 * ── 스타일 방식 ────────────────────────────────────────────────────────────
 * 이 앱의 지배적 관례는 useColors() 기반 인라인 style 객체다(컴포넌트 44개 중
 * StyleSheet.create를 쓰는 건 1개뿐). 색이 훅에서 오므로 모듈 레벨
 * StyleSheet.create에 담을 수 없기 때문이다. 그래서 여기서는 혼합 방식을 쓴다 —
 * 색이 없는 정적 수치(radius/padding/gap)는 StyleSheet.create로 한 번만 만들고,
 * 테마 의존 색만 인라인으로 병합한다. 관례와 재생성 비용 둘 다 챙긴다.
 *
 * ── Header 미구현 ──────────────────────────────────────────────────────────
 * 현재 화면들은 섹션 제목을 카드 밖에 두므로 Header 미구현.
 * 사용처 발생 시 추가. Compound 골격(Context, __DEV__ 경고)은 그대로 두어
 * Card.Header를 나중에 붙일 수 있게 했다.
 *
 * ── variant 근거 ───────────────────────────────────────────────────────────
 * 기존 화면에서 실제로 쓰이는 카드 패턴만 옮겼다. elevated/outlined는 만들지
 * 않는다 — DESIGN.md가 그림자를 라이트 전용으로 묶어 두어서, 이 앱의 모든 카드가
 * "보더 상시 + 그림자는 라이트에서만"이다. 즉 둘은 별개 variant가 아니라 같은
 * 카드가 테마에 따라 다르게 보이는 것이다.
 */
import React, { createContext, useContext, useMemo } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  useColors,
  lightColors,
  accentTint,
  LIGHT_CARD_SHADOW,
  space,
  radius,
  type AccentToken,
  type ThemeColors,
} from "../../tokens";

/**
 * default — L1 표준 카드. surface + 1px 보더 + 라이트 전용 그림자.
 * nested  — L2 중첩 블록. 카드 안에 놓이는 행/블록. 보더·그림자 없음.
 * accent  — 강조색 틴트 배경 + 강조색 보더. 통계 요약 타일 등.
 */
export type CardVariant = "default" | "nested" | "accent";

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** variant="accent"일 때 쓰는 강조색 토큰. 그 외 variant에서는 무시된다. */
  accentColor?: AccentToken;
  style?: StyleProp<ViewStyle>;
  /** 넘기면 Pressable로 렌더되고 button 역할·눌림 피드백이 붙는다. */
  onPress?: () => void;
  /** onPress가 있을 때 스크린리더가 읽을 라벨. */
  accessibilityLabel?: string;
  testID?: string;
}

interface CardContextValue {
  variant: CardVariant;
  colors: ThemeColors;
}

const CardContext = createContext<CardContextValue | null>(null);

/** Card 밖에서 하위 컴포넌트를 쓰면 개발 중에 알려준다. */
function useCardContext(componentName: string): CardContextValue | null {
  const ctx = useContext(CardContext);
  if (
    ctx === null &&
    typeof __DEV__ !== "undefined" &&
    __DEV__
  ) {
    console.warn(
      `[design-system] ${componentName}는 <Card> 안에서만 써야 합니다. ` +
        `Card 밖에서는 variant에 맞는 배경·구분선 색을 알 수 없습니다.`
    );
  }
  return ctx;
}

// 색이 없는 정적 수치만. 값의 근거는 DESIGN.md의 radius/space 토큰이다.
// (radius.card 16 / radius.control 12 / space.16 / space.12 / space.8)
// 수치 토큰 자체는 아직 앱에 없어 Phase 1-B에서 tokens/로 뺀다.
const styles = StyleSheet.create({
  default: { borderRadius: radius.card, padding: space[16], borderWidth: 1 },
  nested: { borderRadius: radius.control, padding: space[12] },
  accent: { borderRadius: radius.card, padding: space[16], borderWidth: 1 },
  body: { gap: space[8] },
  footer: { marginTop: space[12], paddingTop: space[12], borderTopWidth: 1 },
  pressed: { opacity: 0.7 },
});

function CardRoot({
  children,
  variant = "default",
  accentColor = "primary",
  style,
  onPress,
  accessibilityLabel,
  testID,
}: CardProps) {
  const colors = useColors();

  const variantStyle = useMemo<ViewStyle>(() => {
    switch (variant) {
      case "nested":
        // L2. 카드(L1) 안에 놓이므로 배경 명도 차만으로 구분된다.
        return { backgroundColor: colors.surfaceAlt };
      case "accent":
        return {
          backgroundColor: accentTint(colors, accentColor),
          borderColor: colors[accentColor],
        };
      default:
        return { backgroundColor: colors.surface, borderColor: colors.border };
    }
  }, [variant, accentColor, colors]);

  // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서는 보더와 명도 차가 경계를 만든다.
  // useColors()는 lightColors / darkColors 객체를 그대로 반환하므로 참조 비교로
  // 판정한다. 색 값을 하드코딩하지 않고, 테마 스토어도 직접 보지 않는다
  // (design-system은 tokens/ 밖을 참조하지 않는다).
  // 그림자는 default에만 준다 — nested는 카드 안이라 필요 없고, accent는 앱의
  // StatCard와 같이 틴트+보더로만 경계를 만든다.
  const shadow =
    colors === lightColors && variant === "default" ? LIGHT_CARD_SHADOW : null;

  const ctx = useMemo<CardContextValue>(() => ({ variant, colors }), [variant, colors]);
  const base = styles[variant];

  if (onPress) {
    return (
      <CardContext.Provider value={ctx}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          testID={testID}
          style={({ pressed }) => [
            base,
            variantStyle,
            shadow,
            pressed && styles.pressed,
            style,
          ]}>
          {children}
        </Pressable>
      </CardContext.Provider>
    );
  }

  return (
    <CardContext.Provider value={ctx}>
      <View testID={testID} style={[base, variantStyle, shadow, style]}>
        {children}
      </View>
    </CardContext.Provider>
  );
}

export interface CardSlotProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** 본문 슬롯. 카드의 padding은 Card가 소유하므로 여기서는 행 간격만 만든다. */
function CardBody({ children, style, testID }: CardSlotProps) {
  useCardContext("Card.Body");
  return (
    <View testID={testID} style={[styles.body, style]}>
      {children}
    </View>
  );
}

/** 하단 슬롯. 본문과 1px 구분선으로 나눈다. */
function CardFooter({ children, style, testID }: CardSlotProps) {
  const ctx = useCardContext("Card.Footer");
  const colors = useColors();
  const borderTopColor = ctx?.colors.border ?? colors.border;
  return (
    <View testID={testID} style={[styles.footer, { borderTopColor }, style]}>
      {children}
    </View>
  );
}

export const Card = Object.assign(CardRoot, {
  Body: CardBody,
  Footer: CardFooter,
});
