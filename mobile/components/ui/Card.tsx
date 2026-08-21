import React from "react";
import { View, ViewProps } from "react-native";
import { useThemeStore } from "../../store/themeStore";

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** 패딩 없는 카드 */
  bare?: boolean;
  /** 그림자 강도 */
  shadow?: boolean;
}

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
// (app/(tabs)/index.tsx, workout.tsx, stats.tsx와 동일 패턴)
const LIGHT_SHADOW_SM = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

export function Card({
  children,
  bare = false,
  shadow = true,
  className,
  style,
  ...props
}: CardProps) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  // 회귀 방지: 그림자는 라이트 모드에서만. 다크 배경(#171B21) 위에서는 거의 보이지
  // 않으면서 렌더 비용만 든다. 다크의 계층 분리는 surface 명도 차와 아래 border가
  // 담당한다(DESIGN.md 기반 규칙: "그림자는 라이트 모드에서만 허용한다").
  const shadowStyle = shadow && !isDark ? LIGHT_SHADOW_SM : undefined;

  return (
    <View
      className={[
        // radius는 DESIGN.md radius.card(16). 이전 30px는 토큰 사다리 밖이었다.
        "bg-surface rounded-[16px] border border-border",
        bare ? "" : "p-4",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={[shadowStyle, style]}
      {...props}>
      {children}
    </View>
  );
}
